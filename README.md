# Project Build & Setup Documentation
This document provides detailed steps to build, set up, and run the Elasticsearch Debugging GUI project.

## Prerequisites
- Node.js (v18 or higher recommended)
- Python (v3.9+ recommended)

# Backend Setup (FastAPI)
- Navigate to Backend Directory:

```bash
  cd es-backend
```
- Create and Activate Virtual Environment:
```bash
python -m venv venv
```

-  Activate (Linux/macOS)
```bash
source venv/bin/activate
```

- Activate (Windows)
```bash
venv\Scripts\activate
```

- Install Dependencies:
```bash
pip install -r requirements.txt
```

- Run FastAPI Server:
```bash
uvicorn app.main:app --reload
```

# Frontend Setup (Next.js)

- Navigate to Frontend Directory:
```bash
cd es-frontend
```
- Install Node Modules:
```bash
npm install
```
- Run Development Server:
```bash
npm run dev
```
- Open your browser at: http://localhost:3000

## Connecting Frontend and Backend
- Ensure the FastAPI server is running at http://127.0.0.1:8000
- API requests from Next.js should be made to this backend
- Configure CORS in FastAPI if accessing from different origin

```bash
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

```
## Testing
- Use browser and browser dev tools to validate requests
- Use Postman or cURL to test FastAPI endpoints independently

## Notes
- Keep .env  ready with these API keys :
```bash
 DATASOURCE_ID, DATASOURCE_UID, GRAFANA_ORG_ID, GRAFANA_BASE_URL, GRAFANA_API_TOKEN, OPENAI_URL, OPENAI_API_KEY, RED_API_TOKEN
```

## Final Checklist
- Backend running on port 8000
- Frontend running on port 3000
- Elasticsearch cluster connected
- All environment variables configured

