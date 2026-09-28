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
RUN npm ci

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
COPY incoming/ ./incoming/

# Copy unified runner script
COPY run.py ./

# Copy compiled frontend distribution from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Default cloud port environment variable
ENV PORT=8080
ENV HOST=0.0.0.0
ENV PYTHONDONTWRITEBYTECODE=1
RUN useradd --create-home --uid 10001 ocean
USER ocean
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/api/health', timeout=5)" || exit 1

# Launch server
CMD ["python", "run.py"]
