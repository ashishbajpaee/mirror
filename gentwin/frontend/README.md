# GenTwin Frontend (Vite + React)

## Run

```powershell
cd frontend
npm install
npm run dev
```

## Backend URL Configuration

The UI reads these environment variables:

- `VITE_API_BASE_URL` (default `http://localhost:8000`)
- `VITE_WS_BASE_URL` (optional, defaults to API URL with `ws://`)

Example:

```powershell
$env:VITE_API_BASE_URL = "http://127.0.0.1:8000"
npm run dev
```

## Build

```powershell
npm run build
```
