import numpy as np
import pytest

from training.network import build_cnn, keras, tf


@pytest.mark.parametrize("multilabel", [False, True])
def test_unicode_vocabulary_is_training_only_and_reload_is_identical(tmp_path, multilabel):
    model = build_cnn(
        ["English 数学", "Bahasa Melayu 地理"],
        classes=3,
        multilabel=multilabel,
        max_chars=32,
        embedding_dim=4,
        filters=4,
        dense_units=4,
    )
    vocabulary = model.get_layer("characters").get_vocabulary()
    assert "数" in vocabulary and "Ω" not in vocabulary
    text = tf.constant(["数学 Ω", "English Melayu"])
    before = model(text, training=False).numpy()
    assert before.shape == (2, 3)
    assert (before >= 0).all() and (before <= 1).all()
    if not multilabel:
        np.testing.assert_allclose(before.sum(axis=1), 1, atol=1e-6)
    model.save(tmp_path / "model.keras")
    loaded = keras.models.load_model(tmp_path / "model.keras", safe_mode=True, compile=False)
    np.testing.assert_allclose(before, loaded(text, training=False).numpy(), atol=1e-6)


def test_multilabel_metrics_include_mixed_sections():
    from training.metrics import evaluate

    truth = np.array([[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0]])
    report = evaluate(
        "language", truth, truth.astype(float), ["English", "Malay", "Chinese"], [0.5] * 3
    )
    assert report["macro_f1"] == 1
    assert report["code_switch_sections"] == 1
    assert report["code_switch_exact_match"] == 1
    assert not report["scores_are_speaking_time_percentages"]
