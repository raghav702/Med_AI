# Security Configuration Guide

This document provides comprehensive information about the security configuration options available in the Medical AI Assistant application.

## Overview

The application implements three layers of security protection:
1. **Rate Limiting** - Prevents API abuse by limiting requests per IP address
2. **CORS Protection** - Restricts API access to authorized domains only
3. **Input Validation** - Validates and sanitizes incoming requests

## Environment Variables

### Rate Limiting Configuration

| Variable | Default | Description | Requirements |
|----------|---------|-------------|--------------|
| `ENABLE_RATE_LIMITING` | `true` | Enable/disable rate limiting middleware | Requirement 1.1 |
| `RATE_LIMIT_PER_MINUTE` | `5` | Maximum requests per IP per minute | Requirement 1.1 |
| `RATE_LIMIT_PER_HOUR` | `50` | Maximum requests per IP per hour | Requirement 1.2 |
| `RATE_LIMIT_BLOCK_HOURS` | `1` | Hours to block IP after exceeding limits | Requirement 1.2 |

**Example Configuration:**
```bash
# Production (strict limits)
ENABLE_RATE_LIMITING=true
RATE_LIMIT_PER_MINUTE=5
RATE_LIMIT_PER_HOUR=50
RATE_LIMIT_BLOCK_HOURS=1

# Development (relaxed limits)
ENABLE_RATE_LIMITING=true
RATE_LIMIT_PER_MINUTE=10
RATE_LIMIT_PER_HOUR=100
RATE_LIMIT_BLOCK_HOURS=1
```

### CORS Configuration

| Variable | Default | Description | Requirements |
|----------|---------|-------------|--------------|
| `CORS_ALLOWED_ORIGINS` | - | Comma-separated list of allowed origins for production | Requirement 2.1, 2.3 |
| `CORS_DEV_ORIGINS` | - | Additional origins allowed in development mode | Requirement 2.4 |
| `CORS_ALLOW_CREDENTIALS` | `true` | Allow credentials in CORS requests | Requirement 2.2 |

**Example Configuration:**
```bash
# Production
CORS_ALLOWED_ORIGINS=https://medical-assistant.com,https://www.medical-assistant.com
CORS_ALLOW_CREDENTIALS=true

# Development (additional to default localhost ports)
CORS_DEV_ORIGINS=http://localhost:4000,http://localhost:8081
CORS_ALLOW_CREDENTIALS=true
```

### Input Validation Configuration

| Variable | Default | Description | Requirements |
|----------|---------|-------------|--------------|
| `ENABLE_INPUT_VALIDATION` | `true` | Enable/disable input validation middleware | Requirement 3.1 |
| `MAX_MESSAGE_LENGTH` | `1000` | Maximum allowed message length in characters | Requirement 3.1 |
| `LOG_VALIDATION_FAILURES` | `true` | Log validation failures for monitoring | Requirement 3.4 |
| `SUSPICIOUS_PATTERN_THRESHOLD` | `10` | Threshold for detecting suspicious patterns | Requirement 3.3 |

**Example Configuration:**
```bash
# Standard configuration
ENABLE_INPUT_VALIDATION=true
MAX_MESSAGE_LENGTH=1000
LOG_VALIDATION_FAILURES=true
SUSPICIOUS_PATTERN_THRESHOLD=10
```

## Deployment Configurations

### Production Deployment

For production deployments, use strict security settings:

```bash
# Security - Production Settings
ENABLE_RATE_LIMITING=true
RATE_LIMIT_PER_MINUTE=5
RATE_LIMIT_PER_HOUR=50
RATE_LIMIT_BLOCK_HOURS=1

# CORS - Production Domain
CORS_ALLOWED_ORIGINS=https://your-production-domain.com,https://www.your-production-domain.com
CORS_ALLOW_CREDENTIALS=true

# Input Validation - Strict
ENABLE_INPUT_VALIDATION=true
MAX_MESSAGE_LENGTH=1000
LOG_VALIDATION_FAILURES=true
SUSPICIOUS_PATTERN_THRESHOLD=10
```

### Development Environment

For development, use relaxed settings that still provide protection:

```bash
# Security - Development Settings
ENABLE_RATE_LIMITING=true
RATE_LIMIT_PER_MINUTE=10
RATE_LIMIT_PER_HOUR=100
RATE_LIMIT_BLOCK_HOURS=1

# CORS - Development (localhost is automatically allowed)
CORS_DEV_ORIGINS=http://localhost:4000,http://localhost:8081
CORS_ALLOW_CREDENTIALS=true

# Input Validation - Same as production
ENABLE_INPUT_VALIDATION=true
MAX_MESSAGE_LENGTH=1000
LOG_VALIDATION_FAILURES=true
SUSPICIOUS_PATTERN_THRESHOLD=10
```

### Docker Configuration

The security settings are automatically passed to Docker containers through environment variables:

#### Production Docker (docker-compose.yml)
```yaml
environment:
  - ENABLE_RATE_LIMITING=${ENABLE_RATE_LIMITING:-true}
  - RATE_LIMIT_PER_MINUTE=${RATE_LIMIT_PER_MINUTE:-5}
  - RATE_LIMIT_PER_HOUR=${RATE_LIMIT_PER_HOUR:-50}
  - RATE_LIMIT_BLOCK_HOURS=${RATE_LIMIT_BLOCK_HOURS:-1}
  - CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS}
  - CORS_ALLOW_CREDENTIALS=${CORS_ALLOW_CREDENTIALS:-true}
  - ENABLE_INPUT_VALIDATION=${ENABLE_INPUT_VALIDATION:-true}
  - MAX_MESSAGE_LENGTH=${MAX_MESSAGE_LENGTH:-1000}
  - LOG_VALIDATION_FAILURES=${LOG_VALIDATION_FAILURES:-true}
  - SUSPICIOUS_PATTERN_THRESHOLD=${SUSPICIOUS_PATTERN_THRESHOLD:-10}
```

#### Development Docker (docker-compose.dev.yml)
```yaml
environment:
  - ENABLE_RATE_LIMITING=${ENABLE_RATE_LIMITING:-true}
  - RATE_LIMIT_PER_MINUTE=${RATE_LIMIT_PER_MINUTE:-10}
  - RATE_LIMIT_PER_HOUR=${RATE_LIMIT_PER_HOUR:-100}
  - RATE_LIMIT_BLOCK_HOURS=${RATE_LIMIT_BLOCK_HOURS:-1}
  - CORS_DEV_ORIGINS=${CORS_DEV_ORIGINS}
  - CORS_ALLOW_CREDENTIALS=${CORS_ALLOW_CREDENTIALS:-true}
  - ENABLE_INPUT_VALIDATION=${ENABLE_INPUT_VALIDATION:-true}
  - MAX_MESSAGE_LENGTH=${MAX_MESSAGE_LENGTH:-1000}
  - LOG_VALIDATION_FAILURES=${LOG_VALIDATION_FAILURES:-true}
  - SUSPICIOUS_PATTERN_THRESHOLD=${SUSPICIOUS_PATTERN_THRESHOLD:-10}
```

## Security Behavior

### Rate Limiting
- **Per-minute limit**: Blocks IP after exceeding `RATE_LIMIT_PER_MINUTE` requests in 60 seconds
- **Per-hour limit**: Blocks IP after exceeding `RATE_LIMIT_PER_HOUR` requests in 3600 seconds
- **Block duration**: IP remains blocked for `RATE_LIMIT_BLOCK_HOURS` hours
- **Response**: Returns HTTP 429 with `Retry-After` header

### CORS Protection
- **Production**: Only allows origins specified in `CORS_ALLOWED_ORIGINS`
- **Development**: Allows localhost ports (3000, 5173, 8080) plus `CORS_DEV_ORIGINS`
- **Preflight**: Handles OPTIONS requests with appropriate CORS headers
- **Credentials**: Supports credentials when `CORS_ALLOW_CREDENTIALS=true`

### Input Validation
- **Length check**: Rejects messages longer than `MAX_MESSAGE_LENGTH`
- **Empty check**: Rejects empty or whitespace-only messages
- **Pattern detection**: Identifies suspicious patterns (repeated characters, etc.)
- **Logging**: Records validation failures when `LOG_VALIDATION_FAILURES=true`

## Monitoring and Logging

Security events are logged with the following information:
- Timestamp
- IP address
- Event type (rate_limit, validation_failure, cors_violation)
- Request details
- Action taken

Example log entries:
```
2024-01-15 10:30:45 - SECURITY - Rate limit exceeded for IP 192.168.1.100
2024-01-15 10:31:02 - SECURITY - Input validation failed: message too long (1500 chars)
2024-01-15 10:31:15 - SECURITY - CORS violation from origin https://malicious-site.com
```

## Troubleshooting

### Common Issues

1. **Rate limiting too strict in development**
   - Increase `RATE_LIMIT_PER_MINUTE` and `RATE_LIMIT_PER_HOUR`
   - Temporarily disable with `ENABLE_RATE_LIMITING=false`

2. **CORS errors in production**
   - Verify `CORS_ALLOWED_ORIGINS` includes your frontend domain
   - Check for protocol mismatches (http vs https)
   - Ensure no trailing slashes in domain URLs

3. **Input validation rejecting valid messages**
   - Check `MAX_MESSAGE_LENGTH` setting
   - Review `SUSPICIOUS_PATTERN_THRESHOLD` value
   - Temporarily disable with `ENABLE_INPUT_VALIDATION=false`

### Testing Security Configuration

Use these commands to test security settings:

```bash
# Test rate limiting
for i in {1..10}; do curl -X POST http://localhost:8000/api/chat; done

# Test CORS (replace with your domain)
curl -H "Origin: https://unauthorized-domain.com" http://localhost:8000/api/chat

# Test input validation
curl -X POST -H "Content-Type: application/json" \
  -d '{"message":"'$(python -c "print('a'*1500)")'"}" \
  http://localhost:8000/api/chat
```

## Security Best Practices

1. **Always enable all security features in production**
2. **Use HTTPS in production** (configure `CORS_ALLOWED_ORIGINS` with https://)
3. **Monitor security logs** regularly for suspicious activity
4. **Adjust rate limits** based on legitimate usage patterns
5. **Keep security settings** in environment variables, not in code
6. **Test security configuration** before deploying to production

## Google Cloud Deployment

### Setting Up Secrets

For production deployment on Google Cloud, the CORS allowed origins should be stored as a secret:

```bash
# Create the CORS allowed origins secret
echo "https://your-production-domain.com,https://www.your-production-domain.com" | \
  gcloud secrets create cors-allowed-origins --data-file=-

# Verify the secret was created
gcloud secrets describe cors-allowed-origins
```

### Cloud Build Configuration

The `cloudbuild.yaml` file is configured to automatically set security environment variables during deployment:

- **Environment Variables**: Set directly in Cloud Run service
- **Secrets**: Retrieved from Google Secret Manager
- **CORS Origins**: Stored as a secret for security

### Manual Cloud Run Deployment

If deploying manually, include all security settings:

```bash
gcloud run deploy medical-assistant \
  --image gcr.io/PROJECT_ID/medical-assistant:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "ENVIRONMENT=production,PORT=8080,ENABLE_RATE_LIMITING=true,RATE_LIMIT_PER_MINUTE=5,RATE_LIMIT_PER_HOUR=50,RATE_LIMIT_BLOCK_HOURS=1,CORS_ALLOW_CREDENTIALS=true,ENABLE_INPUT_VALIDATION=true,MAX_MESSAGE_LENGTH=1000,LOG_VALIDATION_FAILURES=true,SUSPICIOUS_PATTERN_THRESHOLD=10" \
  --set-secrets "GOOGLE_API_KEY=medical-assistant-secrets:latest:google-api-key,SUPABASE_URL=medical-assistant-secrets:latest:supabase-url,SUPABASE_ANON_KEY=medical-assistant-secrets:latest:supabase-anon-key,SUPABASE_SERVICE_ROLE_KEY=medical-assistant-secrets:latest:supabase-service-role-key,CORS_ALLOWED_ORIGINS=medical-assistant-secrets:latest:cors-allowed-origins"
```

## Requirements Mapping

This configuration addresses the following requirements:

- **Requirement 2.3**: Production CORS domain configuration
- **Requirement 2.4**: Development vs production domain restrictions
- **Rate Limiting**: Requirements 1.1-1.5
- **CORS Protection**: Requirements 2.1-2.5
- **Input Validation**: Requirements 3.1-3.5