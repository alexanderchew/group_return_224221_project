"""Local publication rules; provider checkpoints and published packs stay immutable."""
from __future__ import annotations

import re
from random import SystemRandom

from .core import Problem, uid
from .schemas import GeneratedPack

OUTPUT_PROCESSING_VERSION = "quiz-overview-v1"


def clean_overview_text(text: str, segment_ids: set[str]) -> str:
    # Match whole IDs, including unknown IDs in the backend's UUID format. Never
    # remove ordinary brackets, chemical formulae or a prefix of another word.
    tokens = [re.escape(value) for value in sorted(segment_ids, key=len, reverse=True)]
    tokens.append(r"seg_[0-9a-f]{32}")
    reference = re.compile(r"(?<![\w-])(?:" + "|".join(tokens) + r")(?![\w-])")

    def citation_only(value: str) -> bool:
        if not reference.search(value):
            return False
        remainder = reference.sub("", value)
        remainder = re.sub(r"\b(?:sources?|evidence|segments?|references?|ids?|and|see)\b", "", remainder, flags=re.I)
        return not re.sub(r"[\s,;:'\"`.*#-]", "", remainder)

    def link(match):
        label, target = match.groups()
        if reference.search(target):
            return "" if citation_only(label + " " + target) else reference.sub("", label)
        return match.group()

    text = re.sub(r"\[([^\]\n]*)\]\(([^()\n]*)\)", link, text)
    for pattern in (r"\[([^\[\]\n]*)\]", r"\(([^()\n]*)\)", r"\{([^{}\n]*)\}", r"`([^`\n]*)`"):
        text = re.sub(pattern, lambda match: "" if citation_only(match[1]) else match[0], text)
    text = reference.sub("", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" +([,.;:!?])", r"\1", text).strip()
    if not text:
        raise Problem("invalid_generated_output", "The generated overview has no readable content.")
    return text


def assemble_metadata(parts: list[GeneratedPack], segments: list[dict]) -> dict:
    ids = {segment["id"] for segment in segments}
    metadata = parts[0].metadata.model_dump()
    metadata["title"] = clean_overview_text(metadata["title"], ids)
    metadata["description"] = "\n\n".join(clean_overview_text(part.metadata.description, ids) for part in parts)
    metadata["evidence_segment_ids"] = list(dict.fromkeys(ref for part in parts for ref in part.metadata.evidence_segment_ids))
    metadata["topics"] = [{**topic.model_dump(), "text": clean_overview_text(topic.text, ids)}
                          for part in parts for topic in part.metadata.topics]
    # Keep all structured citations; only student-facing prose is cleaned.
    return metadata


def assemble_quiz(parts: list[GeneratedPack]) -> tuple[list[dict], dict]:
    random = SystemRandom()
    positions = list(range(4))
    questions, key, seen = [], {}, set()
    for group_index in range(5):
        for part in parts:
            if len(questions) >= 5 or group_index >= len(part.questions):
                continue
            question = part.questions[group_index]
            normalized = question.prompt.strip().casefold()
            if normalized in seen:
                continue
            seen.add(normalized)
            if len(questions) % 4 == 0:
                random.shuffle(positions)
            target = positions[len(questions) % 4]
            correct = next(option for option in question.options if option.id == question.correct_option_id)
            options = [option for option in question.options if option.id != question.correct_option_id]
            random.shuffle(options)
            options.insert(target, correct)
            # Relabel once, before publication, so client order, option IDs and
            # the frozen answer key agree even when every provider key was A.
            public_options = [{"id": "abcd"[index], "text": option.text} for index, option in enumerate(options)]
            question_id = uid("q")
            questions.append({"id": question_id, **question.model_dump(exclude={"options", "correct_option_id", "explanation"}),
                              "options": public_options})
            key[question_id] = {"correct_option_id": public_options[target]["id"],
                                "explanation": question.explanation,
                                "evidence_segment_ids": list(question.evidence_segment_ids)}
    return questions, key
