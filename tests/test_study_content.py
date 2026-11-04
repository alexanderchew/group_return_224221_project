"""Regression checks replay saved generation; external HTTP is blocked by conftest."""
import json
from collections import Counter
from pathlib import Path

import pytest

from conftest import operation_key, upload, wav_bytes
from lecture_backend.core import Problem, digest, now, uid
from lecture_backend.providers import PROMPT_VERSION
from lecture_backend.schemas import GeneratedPack
from lecture_backend.study_content import assemble_metadata, assemble_quiz, clean_overview_text
from lecture_backend.worker import validate_generated


@pytest.fixture
def saved_generation():
    path = Path(__file__).resolve().parents[1] / 'fixtures/regressions/photosynthesis-generated-v1.json'
    fixture = json.loads(path.read_text())
    assert fixture['fixture_mode'] == 'SAVED_REAL_PROVIDER_OUTPUT_OFFLINE_REPLAY'
    return GeneratedPack.model_validate(fixture['generated']), fixture['segments']


@pytest.mark.parametrize('count', range(6))
def test_answer_positions_and_keys_preserve_content(saved_generation, count):
    source, _ = saved_generation
    part = source.model_copy(deep=True)
    part.questions = [source.questions[index % 4].model_copy(
        update={'prompt': f'{index}: {source.questions[index % 4].prompt}'}, deep=True) for index in range(count)]
    original = part.model_dump()
    assert all(question.correct_option_id == question.options[0].id for question in part.questions)

    questions, key = assemble_quiz([part])

    assert len(questions) == count
    positions = []
    for question, raw in zip(questions, part.questions, strict=True):
        assert [option['id'] for option in question['options']] == list('abcd')
        answer = key[question['id']]
        correct = next(option for option in question['options'] if option['id'] == answer['correct_option_id'])
        assert correct['text'] == next(option.text for option in raw.options if option.id == raw.correct_option_id)
        assert {option['text'] for option in question['options']} == {option.text for option in raw.options}
        assert answer['explanation'] == raw.explanation
        assert answer['evidence_segment_ids'] == raw.evidence_segment_ids
        assert 'correct_option_id' not in question and 'explanation' not in question
        positions.append(question['options'].index(correct))
    assert len(set(positions[:4])) == min(count, 4)
    if positions:
        assert max(Counter(positions).values()) <= 2
    assert part.model_dump() == original


@pytest.mark.parametrize('text,expected', [
    ('Light energy [seg_one, seg_two].', 'Light energy.'),
    ('Light energy (sources: `seg_one`; `seg_two`).', 'Light energy.'),
    ('Light energy `seg_one`.', 'Light energy.'),
    ('Light energy seg_one.', 'Light energy.'),
    ('[Light energy](seg_one) is absorbed.', 'Light energy is absorbed.'),
    ('Light energy [source](seg_one).', 'Light energy.'),
    ('CO2 + H2O (raw materials) [CO2] [seg_one].', 'CO2 + H2O (raw materials) [CO2].'),
    ('Keep seg_one_total and seg_oneness.', 'Keep seg_one_total and seg_oneness.'),
    ('Light [seg_0123456789abcdef0123456789abcdef].', 'Light.'),
])
def test_overview_citations_do_not_damage_lesson_text(text, expected):
    assert clean_overview_text(text, {'seg_one', 'seg_two'}) == expected


def test_overview_cannot_be_only_citations():
    with pytest.raises(Problem, match='no readable content'):
        clean_overview_text('[seg_one]', {'seg_one'})


def test_merged_overview_keeps_structured_evidence(saved_generation):
    first, segments = saved_generation
    second = first.model_copy(deep=True)
    second.metadata.title += f" [source: {segments[0]['id']}]"
    second.metadata.topics[0].text += f" ({segments[-1]['id']})"
    original = [part.model_dump() for part in (first, second)]
    metadata = assemble_metadata([second, first], segments)
    assert metadata['title'] == first.metadata.title
    prose = [metadata['title'], metadata['description'], *[topic['text'] for topic in metadata['topics']]]
    assert all(segment['id'] not in text for segment in segments for text in prose)
    assert len(metadata['description'].split('\n\n')) == 2
    assert metadata['evidence_segment_ids'] == first.metadata.evidence_segment_ids
    assert [topic['evidence_segment_ids'] for topic in metadata['topics']] == [
        topic.evidence_segment_ids for part in (second, first) for topic in part.metadata.topics]
    assert [part.model_dump() for part in (first, second)] == original


def test_saved_real_output_worker_scoring_and_history_offline(backend, saved_generation):
    client, app, providers = backend
    generated, segments = saved_generation
    original = generated.model_dump()
    validate_generated(generated, segments)

    def no_transcription(*args):
        raise AssertionError('Replay must reuse the saved transcript, without transcription.')

    def replay(*args):
        providers.generations += 1
        return generated.model_copy(deep=True), {
            'provider': 'SAVED_REAL_PROVIDER_OUTPUT_OFFLINE_REPLAY',
            'model': 'saved-gpt-6-luna-response', 'prompt_version': 'lecture-evidence-v1'}

    providers.transcribe, providers.generate = no_transcription, replay
    rec = upload(client, title='Saved photosynthesis output — offline regression', data=wav_bytes(61)).json()
    revision = {'id': uid('transcript'), 'recording_id': rec['id'], 'parent_revision_id': None,
                'origin': 'provider', 'provider': 'SAVED_OUTPUT_OFFLINE_REPLAY', 'model': 'saved-scribe-v2-response',
                'created_at': now(), 'segments': segments, '_complete': True,
                'coverage': {'source_duration_seconds': 61, 'covered_intervals': [[0, 61]], 'gaps': []}}
    with app.state.store.tx() as cx:
        app.state.store.put(cx, 'transcript', revision, rec['id'])
        recording = app.state.store.recording(cx, rec['id'])
        recording['current_transcript_revision_id'] = revision['id']
        app.state.store.put(cx, 'recording', recording)
    job = client.post(f"/api/v1/recordings/{rec['id']}/jobs", json={}, headers=operation_key()).json()
    assert app.state.worker.run_once()
    state = client.get('/api/v1/jobs/' + job['id']).json()
    assert state['status'] == 'ready', state
    pack = client.get('/api/v1/study-packs/' + state['study_pack_id']).json()
    assert len(pack['questions']) == 4
    assert 'correct_option_id' not in json.dumps(pack) and '_answer_key' not in pack
    assert 'explanation' not in json.dumps(pack)
    assert '[seg_' in original['metadata']['description']
    assert 'seg_' not in pack['metadata']['description']
    assert pack['metadata']['evidence_segment_ids'] == generated.metadata.evidence_segment_ids
    assert pack['provenance'][0]['output_processing_version'] == 'quiz-overview-v1'

    # Select by the saved correct text, independently of the newly assigned IDs.
    correct_text = {question.prompt: next(option.text for option in question.options if option.id == question.correct_option_id)
                    for question in generated.questions}
    answers = [{'question_id': question['id'],
                'option_id': next(option['id'] for option in question['options'] if option['text'] == correct_text[question['prompt']])}
               for question in pack['questions']]
    assert {answer['option_id'] for answer in answers} == set('abcd')
    url = f"/api/v1/recordings/{rec['id']}/quiz-attempts"
    perfect = client.post(url, json={'study_pack_id': pack['id'], 'answers': answers}, headers=operation_key())
    assert perfect.status_code == 201, perfect.text
    assert perfect.json()['correct_count'] == 4 and perfect.json()['percentage'] == 100
    assert perfect.json()['practice_revealed'] is False
    mixed = [dict(answer) for answer in answers]
    mixed[2]['option_id'] = next(option['id'] for option in pack['questions'][2]['options'] if option['id'] != mixed[2]['option_id'])
    mixed[3]['option_id'] = None
    body, key = {'study_pack_id': pack['id'], 'answers': mixed}, operation_key()
    result = client.post(url, json=body, headers=key).json()
    assert result['correct_count'] == 2 and result['unanswered_count'] == 1 and result['percentage'] == 50
    assert result['practice_revealed'] is True
    assert client.post(url, json=body, headers=key).json() == result
    solutions = client.post('/api/v1/study-packs/' + pack['id'] + '/quiz-solutions', headers=operation_key()).json()
    assert {value['correct_option_id'] for value in solutions['solutions'].values()} == set('abcd')

    # Cached raw generation stays unchanged; a new pack never rewrites old layout/results.
    with app.state.store.tx() as cx:
        checkpoints = app.state.store.list(cx, 'checkpoint')
    assert len(checkpoints) == 1 and checkpoints[0]['payload']['generated'] == original
    assert checkpoints[0]['id'] == 'gen_' + digest([
        revision['id'], 0, None, app.state.settings.openai_model, PROMPT_VERSION])
    redo = client.post(f"/api/v1/recordings/{rec['id']}/jobs", json={'regenerate': True}, headers=operation_key()).json()
    assert app.state.worker.run_once()
    assert client.get('/api/v1/jobs/' + redo['id']).json()['study_pack_id'] != pack['id']
    assert client.get('/api/v1/study-packs/' + pack['id']).json() == pack
    assert client.get('/api/v1/quiz-attempts/' + result['id']).json() == result
    assert providers.generations == 1  # The second pack reused saved, unmodified generation.
    assert generated.model_dump() == original
    budget = app.state.store.budget()
    assert budget['settled_usd'] == budget['reserved_usd'] == budget['uncertain_usd'] == '0.000000'
