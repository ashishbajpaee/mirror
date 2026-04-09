# GenTwin Run Guide

This project has two main parts:

1. Demo stack (FastAPI backend + React frontend)
2. Analysis pipeline (Person 2 modules)

This README gives the current working run flow for this branch.

## 1) Prerequisites

- Python 3.10+
- Node.js 18+

## 2) Install Dependencies

From `gentwin/`:

```powershell
cd C:\Users\Asus\projects\IITK_PS6\mirror\gentwin
python -m pip install -r requirements.txt
```

Frontend dependencies:

```powershell
cd C:\Users\Asus\projects\IITK_PS6\mirror\gentwin\frontend
npm install
```

## 3) Prepare SWaT A9 Dataset (Attack/Normal CSV Split)

If your SWaT A9 folder is:
`C:/Users/Asus/projects/IITK_PS6/swat/SWaT.A9_Nov 2022`

run:

```powershell
cd C:\Users\Asus\projects\IITK_PS6\mirror\gentwin
python prepare_swat_a9_labels.py --dataset-dir "C:/Users/Asus/projects/IITK_PS6/swat/SWaT.A9_Nov 2022" --output-dir data_files --fallback-normal-file "10-Nov-2022_1100_1200.csv"
```

Generated files:

- `data_files/SWaT_A9_Labeled.csv`
- `data_files/SWaT_Normal.csv`
- `data_files/SWaT_Attack.csv`

Note: If strict rule matching finds zero normal rows, `--fallback-normal-file` forces one source file to act as weak-normal so the training pipeline can run.

## 4) Run Analysis Pipeline

Run Person 2 pipeline from `gentwin/`:

```powershell
python analysis/run_person2.py
```

Main artifacts are written to `models_saved/`, including:

- `impact_analysis.csv`
- `security_gaps.csv`
- `security_gaps_explained.csv`
- `rl_q_table.csv`
- `immunity_scores.csv`
- `attack_dna.csv`
- `incident_timeline.csv`

## 5) Run Backend

Recommended (unified API):

```powershell
cd C:\Users\Asus\projects\IITK_PS6\mirror\gentwin
python start_backend.py
```

Equivalent command:

```powershell
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Health checks:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

## 6) Run Frontend

In a second terminal:

```powershell
cd C:\Users\Asus\projects\IITK_PS6\mirror\gentwin\frontend
$env:VITE_API_BASE_URL = "http://127.0.0.1:8000"
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173`.

## 7) Demo Routes

- `/` Defender dashboard
- `/attacker` Attacker terminal
- `/demo` Three-screen launcher
- `/demo/control` Presenter controls
- `/demo/results` Final result sequence
- `/attack-cards` Attack panel

## 8) Pre-Demo Validation

```powershell
cd C:\Users\Asus\projects\IITK_PS6\mirror\gentwin
python validate_demo_stack.py --base-url http://127.0.0.1:8000 --timeout 8
```

## 9) Troubleshooting

- `ModuleNotFoundError: No module named 'simpy'`
  - Run `python -m pip install simpy`

- Frontend exits immediately with code 1
  - Make sure you run from `gentwin/frontend`
  - Run `npm install` again
  - Confirm `VITE_API_BASE_URL` points to the running backend

- Backend starts but frontend has no live data
  - Check backend logs for route/import errors
  - Verify `http://127.0.0.1:8000/api/health` returns JSON

- `run_full_pipeline.py` fails due to missing old scripts
  - Use `analysis/run_person2.py` in this branch
