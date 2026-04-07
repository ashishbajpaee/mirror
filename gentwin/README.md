# GenTwin Mirror Demo Stack

This repository contains two runnable parts:

1. Demo stack (FastAPI backend + React frontend) for judge presentation
2. Analysis pipeline (Person 2 modules) for deeper threat analysis artifacts

## 1) Demo Stack Quick Start (Recommended for Presentation)

### Prerequisites
- Python 3.10+
- Node.js 18+

### A. Backend

From `gentwin/`:

```powershell
cd C:\Users\Asus\projects\IITK_PS6\mirror\gentwin

# Optional: activate your venv first
# C:\Users\Asus\projects\IITK_PS6\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn backend.attacker_terminal:app --host 0.0.0.0 --port 8000 --reload
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

### B. Frontend

In a second terminal:

```powershell
cd C:\Users\Asus\projects\IITK_PS6\mirror\gentwin\frontend
npm install
npm run dev
```

Open the printed Vite URL (usually `http://localhost:5173`).

## 2) Frontend Environment Configuration

The frontend now supports configurable API and WebSocket hosts.

- `VITE_API_BASE_URL` (default: `http://localhost:8000`)
- `VITE_WS_BASE_URL` (optional, default derived from API URL)

Example:

```powershell
cd C:\Users\Asus\projects\IITK_PS6\mirror\gentwin\frontend
$env:VITE_API_BASE_URL = "http://127.0.0.1:8000"
npm run dev
```

## 3) Main Demo Routes

- `/` Defender dashboard
- `/attacker` Attacker terminal
- `/demo` Three-screen launcher
- `/demo/control` Hidden presenter controls
- `/demo/results` Final result sequence
- `/attack-cards` Attack panel

## 4) Optional: Person 2 Analysis Pipeline

Run from `gentwin/`:

```powershell
python analysis/run_person2.py
```

Artifacts are written to `models_saved/` (impact analysis, security gaps, explainability, RL table, immunity, DNA, timeline).

## 5) Troubleshooting

- Backend not reachable:
  - Confirm `uvicorn` is running on port `8000`
  - Check `http://127.0.0.1:8000/api/health`
- Frontend loads but no live data:
  - Verify backend terminal has no import/runtime errors
  - Check browser console for failed `/api/*` or `/ws` requests
- Port conflict:
  - Start backend on another port and set `VITE_API_BASE_URL` accordingly

## 6) Automated Pre-Demo Validation

Before presenting, run one command to verify key API routes and stream readiness:

```powershell
cd C:\Users\Asus\projects\IITK_PS6\mirror\gentwin
python validate_demo_stack.py
```

Optional flags:

```powershell
python validate_demo_stack.py --base-url http://127.0.0.1:8000 --timeout 8
python validate_demo_stack.py --skip-websocket
```
