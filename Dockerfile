# Production Dockerfile for Full-Stack Medical AI Assistant
# Optimized for Google Cloud Run deployment with minimal cost and maximum performance

# ============================================================================
# Stage 1: Frontend Build (React + Vite)
# ============================================================================
FROM node:18-alpine AS frontend-builder

# Set working directory
WORKDIR /app

# Copy package files for better Docker layer caching
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY eslint.config.js ./
COPY index.html ./

# Install all dependencies (including dev dependencies needed for build)
RUN npm ci --no-audit --no-fund

# Copy source code
COPY src/ ./src/
COPY public/ ./public/

# DO NOT copy .env.production - we use build args instead
# The .env.production file can conflict with ARG/ENV variables

# Accept build-time arguments (passed from cloudbuild.yaml)
ARG VITE_API_BASE_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set as environment variables so Vite can access them during build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Debug: Show what environment variables Vite will see during build
RUN echo "🔍 Vite build environment:" && \
    echo "  VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-NOT_SET}" && \
    echo "  VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY:0:30}..." && \
    echo "  VITE_API_BASE_URL=${VITE_API_BASE_URL:-NOT_SET}"

# Build the frontend - Vite will embed these values into the static files
RUN npm run build && \
    echo "✅ Frontend build complete" && \
    echo "📦 Checking dist folder:" && \
    ls -la dist/ && \
    echo "🔍 Verifying embedded config in built files:" && \
    grep -r "lydxcnvyzqaumfmfktor" dist/assets/ || echo "⚠️ Supabase URL not found in built files!"

# ============================================================================
# Stage 2: Python Backend Setup
# ============================================================================
FROM python:3.11-slim AS backend

# Set working directory
WORKDIR /app

# Install system dependencies (minimal set for production)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy Python requirements and install dependencies
COPY assistant_chatbot/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --no-compile -r requirements.txt

# Copy backend source code to app root
COPY assistant_chatbot/backend/ ./

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./static

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash --uid 1000 app \
    && chown -R app:app /app

# Switch to non-root user
USER app

# Expose port 8080 (required by Cloud Run)
EXPOSE 8080

# Add health check for container orchestration
HEALTHCHECK --interval=60s --timeout=30s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Set environment variables for production
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Security environment variables with defaults
ENV ENABLE_RATE_LIMITING=true
ENV RATE_LIMIT_PER_MINUTE=5
ENV RATE_LIMIT_PER_HOUR=50
ENV RATE_LIMIT_BLOCK_HOURS=1
ENV CORS_ALLOW_CREDENTIALS=true
ENV ENABLE_INPUT_VALIDATION=true
ENV MAX_MESSAGE_LENGTH=1000
ENV LOG_VALIDATION_FAILURES=true
ENV SUSPICIOUS_PATTERN_THRESHOLD=10

# Start the FastAPI application with uvicorn
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]