"""Task-appropriate held-out metrics; thresholds are selected on validation only."""

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    hamming_loss,
    multilabel_confusion_matrix,
)


def choose_thresholds(task, truth, scores):
    if task == "subject":
        best = (0.0, 1.0)
        for threshold in np.unique(np.r_[0.0, scores.max(axis=1), 1.0]):
            accepted = scores.max(axis=1) >= threshold
            coverage = float(accepted.mean())
            precision = (
                float((scores.argmax(axis=1)[accepted] == truth[accepted]).mean())
                if accepted.any()
                else 0.0
            )
            if precision >= 0.9 and coverage > best[0]:
                best = coverage, float(threshold)
        return best[1]
    thresholds = []
    for index in range(scores.shape[1]):
        candidates = [
            (
                f1_score(truth[:, index], scores[:, index] >= value, zero_division=0),
                -abs(float(value) - 0.5),
                float(value),
            )
            for value in np.linspace(0.1, 0.9, 17)
        ]
        thresholds.append(max(candidates)[2])
    return thresholds


def evaluate(task, truth, scores, labels, thresholds):
    if not np.isfinite(scores).all() or np.any(scores < 0) or np.any(scores > 1):
        raise ValueError("Model output must contain finite scores in [0, 1].")
    if scores.shape != (len(truth), len(labels)):
        raise ValueError("Model output shape does not match the label order.")
    if task == "subject":
        if not np.allclose(scores.sum(axis=1), 1, atol=1e-4):
            raise ValueError("Subject softmax scores must sum to one.")
        predicted = scores.argmax(axis=1)
        accepted = scores.max(axis=1) >= thresholds
        return {
            "accuracy": float(accuracy_score(truth, predicted)),
            "macro_f1": float(
                f1_score(
                    truth, predicted, labels=range(len(labels)), average="macro", zero_division=0
                )
            ),
            "weighted_f1": float(
                f1_score(
                    truth, predicted, labels=range(len(labels)), average="weighted", zero_division=0
                )
            ),
            "per_class": classification_report(
                truth,
                predicted,
                labels=range(len(labels)),
                target_names=labels,
                output_dict=True,
                zero_division=0,
            ),
            "confusion_matrix": confusion_matrix(
                truth, predicted, labels=range(len(labels))
            ).tolist(),
            "coverage": float(accepted.mean()),
            "selective_precision": float((predicted[accepted] == truth[accepted]).mean())
            if accepted.any()
            else None,
            "accuracy_with_abstentions_as_misses": float(((predicted == truth) & accepted).mean()),
            "out_of_scope_detection_evaluated": False,
        }
    predicted = scores >= np.asarray(thresholds)
    return {
        "exact_match_accuracy": float(accuracy_score(truth, predicted)),
        "macro_f1": float(f1_score(truth, predicted, average="macro", zero_division=0)),
        "micro_f1": float(f1_score(truth, predicted, average="micro", zero_division=0)),
        "hamming_loss": float(hamming_loss(truth, predicted)),
        "per_language": classification_report(
            truth, predicted, target_names=labels, output_dict=True, zero_division=0
        ),
        "confusion_matrices": multilabel_confusion_matrix(truth, predicted).tolist(),
        "code_switch_sections": int((truth.sum(axis=1) > 1).sum()),
        "code_switch_exact_match": float(
            (predicted[truth.sum(axis=1) > 1] == truth[truth.sum(axis=1) > 1]).all(axis=1).mean()
        )
        if (truth.sum(axis=1) > 1).any()
        else None,
        "scores_are_speaking_time_percentages": False,
    }
