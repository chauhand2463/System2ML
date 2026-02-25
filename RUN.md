# System2ML - Running the Project

## Quick Start

### 1. Start the Backend API
```bash
cd "G:/Projects/System2ML"
python -m ui.api
```
The API will run at http://localhost:8000

### 2. Start the Frontend
In a separate terminal:
```bash
cd "G:/Projects/System2ML"
npm run dev
```
The frontend will run at http://localhost:3000

## Or run both together:

### Windows (PowerShell)
```powershell
# Start backend in background
Start-Process python -ArgumentList "-m", "ui.api" -WorkingDirectory "G:\Projects\System2ML"

# Wait a bit
Start-Sleep -Seconds 3

# Start frontend
npm run dev
```

### Windows (Command Prompt)
```cmd
start python -m ui.api
timeout /t 3
npm run dev
```

## Test the API

Once backend is running:
```bash
curl http://localhost:8000/health
```

Test design endpoint:
```bash
curl -X POST http://localhost:8000/api/design/request ^
  -H "Content-Type: application/json" ^
  -d "{\"data_profile\":{\"type\":\"tabular\"},\"objective\":\"accuracy\",\"constraints\":{\"max_cost_usd\":10,\"max_carbon_kg\":1.0,\"max_latency_ms\":200,\"compliance_level\":\"regulated\"},\"deployment\":\"batch\",\"retraining\":\"drift\"}"
```

## Environment Variables

Create a `.env.local` file in the project root:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```
