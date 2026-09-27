# ==============================================================================
# Multi-Stage Production Dockerfile for OceanTwin
# Smart India Hackathon 2026 | Problem Statement: SIH 26067
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend (React 18 + Vite + Tailwind + Three.js)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci || npm install

COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Python Backend & Static SPA Runner
# ------------------------------------------------------------------------------
FROM python:3.12-slim AS runner
WORKDIR /app

# Install system utilities & libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code
COPY backend/ backend/

# Copy ocean datasets & numerical model files
COPY *.csv ./
COPY *.nc4 ./

# Copy unified runner script
COPY run.py ./

# Copy compiled frontend distribution from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Default cloud port environment variable
ENV PORT=8080
EXPOSE 8080

# Launch server
CMD ["python", "run.py"]
