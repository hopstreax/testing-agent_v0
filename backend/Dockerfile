# Production Dockerfile for TraceKit Autonomous Testing Agent Backend
# Uses official Debian-based Python 3.11 slim image
FROM python:3.11-slim-bookworm

# Prevent Python from writing bytecode and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    ENVIRONMENT=production \
    ARTIFACTS_DIR=/app/artifacts/runs

WORKDIR /app

# Install curl for container healthcheck probes
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy project metadata and source code for installation
COPY pyproject.toml README.md ./
COPY app ./app

# Install Python dependencies and Patchright Chromium with Linux runtime libraries
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir . && \
    python -m patchright install --with-deps chromium && \
    rm -rf /var/lib/apt/lists/*

# Create persistent artifacts base directory
RUN mkdir -p /app/artifacts/runs

# Expose default HTTP port
EXPOSE 8000

# Run FastAPI via Uvicorn on 0.0.0.0:8000 with exactly 1 worker
CMD ["uvicorn", "app.server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
