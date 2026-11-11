"""Both CNNs start with random weights; no pretrained vocabulary or model."""

import os
from pathlib import Path
import tempfile

os.environ.setdefault("KERAS_BACKEND", "tensorflow")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("TF_NUM_INTRAOP_THREADS", "2")
os.environ.setdefault("TF_NUM_INTEROP_THREADS", "2")
os.environ.setdefault("KERAS_HOME", str(Path(tempfile.gettempdir()) / "lecture-cnn-keras"))

import keras
import tensorflow as tf


def build_cnn(
    texts: list[str],
    *,
    classes: int,
    multilabel: bool,
    max_chars: int,
    max_tokens: int = 8000,
    embedding_dim: int = 64,
    filters: int = 128,
    dense_units: int = 64,
    seed: int = 42,
):
    keras.utils.set_random_seed(seed)
    tf.config.experimental.enable_op_determinism()
    vectorizer = keras.layers.TextVectorization(
        max_tokens=max_tokens,
        standardize="lower",
        split="character",
        output_mode="int",
        output_sequence_length=max_chars,
        name="characters",
    )
    # Only caller-supplied TRAINING text is allowed to adapt the vocabulary.
    vectorizer.adapt(tf.constant(texts))
    inputs = keras.Input(shape=(), dtype="string", name="original_transcript")
    x = vectorizer(inputs)
    x = keras.layers.Embedding(
        len(vectorizer.get_vocabulary()), embedding_dim, name="learned_embedding"
    )(x)
    x = keras.layers.Conv1D(filters, 5, padding="same", activation="relu", name="learned_patterns")(
        x
    )
    x = keras.layers.GlobalMaxPooling1D()(x)
    x = keras.layers.Dense(dense_units, activation="relu")(x)
    x = keras.layers.Dropout(0.25)(x)
    outputs = keras.layers.Dense(
        classes, activation="sigmoid" if multilabel else "softmax", name="scores"
    )(x)
    model = keras.Model(
        inputs, outputs, name="language_character_cnn" if multilabel else "subject_character_cnn"
    )
    model.compile(
        optimizer=keras.optimizers.Adam(1e-3),
        loss="binary_crossentropy" if multilabel else "sparse_categorical_crossentropy",
        metrics=[keras.metrics.BinaryAccuracy(name="binary_accuracy")]
        if multilabel
        else ["accuracy"],
    )
    return model
