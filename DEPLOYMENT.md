# System2ML Deployment Guide

## Quick Deploy

### Option 1: Vercel (Frontend) + Render/Railway (Backend)

#### Frontend Deployment to Vercel

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

   Or push to GitHub and connect to Vercel:
   - Go to https://vercel.com
   - Import your GitHub repository
   - Vercel will auto-detect Next.js and deploy

3. **Environment Variables** (in Vercel dashboard):
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   ```

#### Backend Deployment to Render/Railway

1. **Create account on Render** (https://render.com) or **Railway** (https://railway.app)

2. **Create a Web Service**:
   - Connect your GitHub repository
   - Set root directory to project root
   - Build command: leave empty
   - Start command: `python -m ui.api`

3. **Environment Variables**:
   - No additional env vars needed (uses SQLite)

4. **Note**: For production, consider using PostgreSQL instead of SQLite

---

### Option 2: Docker Deployment

Create `Dockerfile`:

```dockerfile
# Stage 1: Frontend build
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Backend
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY agent ./agent
COPY ui ./ui
COPY pipelines ./pipelines
COPY memory ./memory
COPY governance ./governance
COPY observability ./observability
COPY orchestrator ./orchestrator
COPY src ./src
COPY system2ml.db .
COPY cli.py .
COPY run.py .
EXPOSE 8000
CMD ["python", "-m", "ui.api"]
```

---

### Option 3: Railway (Full Stack)

1. Go to https://railway.app
2. Create new project
3. Add PostgreSQL plugin
4. Connect GitHub repo
5. Set environment variable:
   ```
   DATABASE_URL=postgresql://...
   ```
6. Deploy

---

## Local Production Run

```bash
# Install dependencies
npm install
pip install -r requirements.txt

# Build frontend
npm run build

# Run both services
npm run start:prod
```

---

## Production Checklist

- [ ] Set `NEXT_PUBLIC_API_URL` in Vercel
- [ ] Configure database (use PostgreSQL for production)
- [ ] Set up custom domain (optional)
- [ ] Enable SSL
- [ ] Configure CORS in `ui/api.py` for production domain
