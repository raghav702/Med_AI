# AI Service Integration

This directory contains the AI service integration for the medical assistant application. It provides a flexible architecture that supports multiple AI providers including OpenAI, Anthropic, and custom RAG systems.

## Architecture Overview

```
AI Service Manager
├── AI Service Interface (Unified API)
├── Medical Prompt Engine (Context-aware prompts)
├── Response Processor (Validation & formatting)
├── Error Handler (Fallback & recovery)
└── Providers
    ├── OpenAI Service
    ├── Anthropic Service
    └── Custom RAG Service (Your RAG integration)
```

## Quick Start

### 1. Environment Configuration

Add these variables to your `.env.local` file:

```bash
# Choose your AI provider
VITE_AI_PROVIDER=custom-rag

# Custom RAG Configuration
VITE_RAG_ENDPOINT=http://localhost:8000
VITE_RAG_API_KEY=your_rag_api_key_here

# Optional: Fallback providers
VITE_OPENAI_API_KEY=your_openai_key
VITE_ANTHROPIC_API_KEY=your_anthropic_key

# AI Settings
VITE_AI_MAX_TOKENS=1000
VITE_AI_TEMPERATURE=0.7
VITE_AI_ENABLE_FALLBACK=true
```

### 2. RAG System Integration

Your RAG system should implement these endpoints:

#### Health Check
```
GET /health
Response: { "status": "healthy" }
```

#### Generate Response
```
POST /generate
Content-Type: application/json
Authorization: Bearer {your_api_key}

Request Body:
{
  "query": "User's message",
  "context": "Additional context",
  "system_prompt": "System instructions",
  "conversation_history": [
    {"role": "user", "content": "Previous message"},
    {"role": "assistant", "content": "Previous response"}
  ],
  "max_tokens": 1000,
  "temperature": 0.7
}

Response:
{
  "response": "Generated response text",
  "confidence": 0.95,
  "sources": ["source1", "source2"],
  "retrieved_documents": [...],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 200,
    "total_tokens": 300
  }
}
```

#### Optional: Knowledge Base Search
```
POST /search
Content-Type: application/json

Request Body:
{
  "query": "Search query",
  "limit": 5
}

Response:
{
  "documents": [
    {
      "content": "Document content",
      "score": 0.95,
      "metadata": {...}
    }
  ]
}
```

### 3. Custom RAG Service Customization

The `CustomRAGService` class in `providers/customRAGService.ts` can be customized for your specific RAG implementation:

```typescript
// Modify the transformRAGResponse method to match your response format
private transformRAGResponse(ragResponse: any): AIResponse {
  return {
    content: ragResponse.your_response_field,
    usage: {
      promptTokens: ragResponse.your_usage?.prompt_tokens || 0,
      completionTokens: ragResponse.your_usage?.completion_tokens || 0,
      totalTokens: ragResponse.your_usage?.total_tokens || 0
    },
    metadata: {
      confidence: ragResponse.your_confidence_field,
      sources: ragResponse.your_sources_field,
      // Add any custom metadata your RAG system provides
    }
  };
}
```

## Integration Steps

### Step 1: Prepare Your RAG System

1. Ensure your RAG system exposes the required HTTP endpoints
2. Implement health check endpoint for service monitoring
3. Configure authentication if needed
4. Test endpoints manually to ensure they work

### Step 2: Configure Environment

1. Update `.env.local` with your RAG endpoint and credentials
2. Set `VITE_AI_PROVIDER=custom-rag`
3. Optionally configure fallback providers

### Step 3: Customize RAG Service (if needed)

1. Modify `providers/customRAGService.ts` to match your API format
2. Update request/response transformation methods
3. Add any custom headers or authentication logic

### Step 4: Test Integration

```bash
# Run AI integration tests
npm run test:run src/test/aiIntegration.test.ts

# Start the application
npm run dev
```

### Step 5: Monitor and Debug

The system provides comprehensive logging and error handling:

- Check browser console for initialization logs
- Use `AIServiceInitializer.getStatus()` to check service health
- Review error logs with `AIErrorHandler.getErrorLogs()`

## Features

### Medical-Specific Prompts
- Context-aware prompt generation for different conversation stages
- Medical safety guidelines and disclaimers
- Emergency detection and escalation prompts

### Robust Error Handling
- Automatic fallback to alternative providers
- Graceful degradation with rule-based responses
- Comprehensive error logging and monitoring

### Response Processing
- Medical content validation
- Response formatting and sanitization
- Structured data extraction (symptoms, urgency, specialties)

### Conversation Management
- Multi-turn conversation support
- Context preservation across messages
- Stage-aware response generation

## API Reference

### AIServiceManager

Main interface for AI operations:

```typescript
// Process user message
const response = await aiServiceManager.processUserMessage(message, context);

// Generate follow-up questions
const questions = await aiServiceManager.generateFollowUpQuestions(symptoms, context);

// Explain doctor recommendations
const explanation = await aiServiceManager.explainDoctorRecommendation(specialty, analysis, context);

// Check service health
const health = await aiServiceManager.getHealthStatus();
```

### Configuration

```typescript
// Get current configuration
const config = AIConfigService.getAIServiceConfig();

// Validate configuration
const validation = AIConfigService.validateConfiguration();

// Get configuration summary
const summary = AIConfigService.getConfigSummary();
```

### Error Handling

```typescript
// Handle errors with fallback responses
const { aiError, fallbackResponse } = AIErrorHandler.handleError(error, context);

// Check if error should trigger retry
const shouldRetry = AIErrorHandler.shouldRetry(aiError, attemptCount);

// Get retry delay
const delay = AIErrorHandler.getRetryDelay(aiError, attemptCount);
```

## Troubleshooting

### Common Issues

1. **RAG Service Connection Failed**
   - Check if your RAG service is running
   - Verify the endpoint URL in environment variables
   - Ensure network connectivity

2. **Authentication Errors**
   - Verify API key configuration
   - Check if your RAG service requires authentication
   - Ensure proper headers are being sent

3. **Response Format Errors**
   - Check if your RAG response format matches expected structure
   - Customize `transformRAGResponse` method if needed
   - Verify required fields are present in responses

4. **Fallback Not Working**
   - Ensure fallback providers are properly configured
   - Check if `VITE_AI_ENABLE_FALLBACK=true`
   - Verify fallback provider credentials

### Debug Mode

Enable debug logging by setting:
```bash
VITE_AI_DEBUG=true
```

This will provide detailed logs of:
- Service initialization
- Request/response cycles
- Error handling
- Fallback activation

## Security Considerations

1. **API Keys**: Store API keys securely and never commit them to version control
2. **Input Validation**: The system validates and sanitizes all inputs
3. **Medical Content**: Responses are checked for appropriate medical disclaimers
4. **Rate Limiting**: Implement rate limiting in your RAG service
5. **HTTPS**: Use HTTPS for all API communications in production

## Performance Optimization

1. **Caching**: Implement response caching in your RAG system
2. **Connection Pooling**: Use connection pooling for database queries
3. **Async Processing**: Leverage async/await for non-blocking operations
4. **Timeout Configuration**: Adjust timeout values based on your RAG performance
5. **Fallback Strategy**: Configure appropriate fallback providers for reliability

## Next Steps

Once your RAG system is integrated:

1. **Monitor Performance**: Track response times and error rates
2. **Optimize Prompts**: Fine-tune prompts based on user interactions
3. **Expand Knowledge Base**: Continuously update your RAG knowledge base
4. **A/B Testing**: Test different prompt strategies and response formats
5. **User Feedback**: Collect and analyze user feedback to improve responses

## Support

For integration support or questions:

1. Check the test files for usage examples
2. Review error logs for debugging information
3. Consult the API documentation for your RAG system
4. Test individual components in isolation

The system is designed to be robust and will continue functioning even if your RAG service is temporarily unavailable, using fallback responses to maintain user experience.