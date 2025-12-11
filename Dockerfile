# Minimal cost Dockerfile optimized for Google Cloud Run
# Uses smaller base images and multi-stage build for reduced size

# Frontend build stage
FROM node:18-alpine AS frontend-builder
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY eslint.config.js ./
COPY index.html ./

# Install all dependencies (needed for build)
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

# Python backend stage - using slim image for smaller size
FROM python:3.11-slim AS backend

# Set working directory
WORKDIR /app

# Install only essential system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy requirements and install Python dependencies
COPY assistant_chatbot/backend/requirements.txt ./
RUN pip install --no-cache-dir --no-compile -r requirements.txt

# Copy backend source
COPY assistant_chatbot/backend/ ./backend/

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./static

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=60s --timeout=30s --start-period=30s --retries=2 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]