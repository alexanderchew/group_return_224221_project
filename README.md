Creators of the AI : Return 224221

# StudySmart AI

An studying AI with interface polished with ChatGPT. It uses your (you) own personal saved model, 
to predict one of three study modes:
1. Foundational Review
2. Guided Practice
3. Exam Practice

## Requirements to run locally

Requires a Python version supported by your installed TensorFlow build.
Reccomcemented python versions : Python 3.11 and Python 3.12

1. Extract this project into a folder and open a terminal there.
2. Create and activate a virtual environment if you wish:

   ```bash
   python -m venv .venv
   # macOS/Linux: source .venv/bin/activate
   # Windows: .venv\Scripts\activate
   ```

3. Install the dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Copy the **two saved files from your second notebook cell** alongside
   `app.py`:

   - `studysmart_model.keras`
   - `studysmart_scaler.joblib`
 
   Also , if you don't have your original files, you can also reproduce the training pipeline using a script:

   ```bash
   python train_demo_model.py
   ```

   This generates new artifacts from the same seeded synthetic dataset and
   architecture, but they might be minor (definition. lesser in importance) training differences that will happen

5. Launch the interface:

   ```bash
   streamlit run app.py
   ```

Streamlit will display a local browser URL, typically `http://localhost:8501`.
It works offline after dependencies and files are installed.

## What the interface includes

- Three one-click learner profiles for demonstrations.
- Four live controls: confidence (1–5), accuracy (0–100%), difficulty (1–5),
  and study time (15–120 min).
- The neural network's predicted study path and all three softmax scores.
- A probability-comparison chart and three human-authored next steps.
- It will show clear warnings when there are missing or incompatible artifacts
- IT has A transparent limitations panel for future development.

## How to run quick tests

```bash
python -m unittest discover -s tests -v
```

These tests cover feature order/ranges and stable inference with a
small mock model; they do not retrain or measure the educational validity of
the actual neural network.

## Some limitations you (you) might want to know

- The notebook's 1,500 labels are assigned by some predefined rules. The neural network is learning an approximation to those rules, not a validated measure of the best learning intervention for a real student.
- `study_time` is included as a feature but has no role in generating labels.
- The interface's "model score" is an output, not a calibrated probability of being correct or improving learning outcomes.
- The suggested next steps are authored copy for each class, not new outputs learned by the neural network.
- `joblib` files rely on pickle serialization. 
Very important note : **Only load trusted files.**
  For best compatibility, run the app with the same TensorFlow, scikit-learn,
  and Python versions used to create the saved artifacts.

## Project structure

```
app.py                 Streamlit web interface
studysmart.py          Input validation and model-inference logic
train_demo_model.py    Optional reproduction of the training notebook
requirements.txt       Python dependencies
.streamlit/config.toml Streamlit appearance settings
tests/                 Focused inference tests
```

This is a reusable prototype designed to be extended with real student data,
teacher review, evaluated learning outcomes, and proper model calibration.


