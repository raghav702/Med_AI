# Medical AI Assistant

A comprehensive medical AI assistant application that provides symptom analysis, doctor matching, health Q&A, and medication information. Built with React frontend and FastAPI backend, optimized for deployment on Google Cloud Platform.

## 🌟 Features

- **Symptom Analysis**: AI-powered symptom triage and medical guidance
- **Smart Doctor Matching**: Find nearby healthcare providers by specialty
- **24/7 Health Q&A**: Get answers to health-related questions
- **Medication Information**: Drug information and interaction checking
- **Emergency Detection**: Automatic emergency alert system
- **Session Management**: Conversation continuity across interactions

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Radix UI** components
- **React Query** for state management
- **React Router** for navigation

### Backend
- **FastAPI** with Python 3.11
- **LangChain** for AI agent orchestration
- **Google Gemini** for language model
- **Supabase** for database and authentication
- **Structured logging** for monitoring

### Infrastructure
- **Google Cloud Run** for serverless deployment
- **Container Registry** for image storage
- **Secret Manager** for secure configuration
- **Cloud Build** for CI/CD

## 💰 Cost Optimization

Configured for minimal cost on Google Cloud Platform:

| Usage Level | Requests/Month | Estimated Cost |
|-------------|----------------|----------------|
| **Minimal** | 100 | **$0.00** (Free tier) |
| **Light** | 1,000 | **$0.00** (Free tier) |
| **Moderate** | 10,000 | **$0.16** |
| **Heavy** | 100,000 | **$1.60** |

*Additional fixed costs: ~$0.16/month for storage and secrets*

## 🚀 Quick Start

### Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Node.js 18+** and **Python 3.11+** for local development
4. **Environment Variables**:
   ```bash
   export GOOGLE_API_KEY="your-google-api-key"
   export SUPABASE_URL="your-supabase-url"
   export SUPABASE_ANON_KEY="your-supabase-anon-key"
   export SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
   ```

### Deploy to Google Cloud

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd medical-assistant

# 2. Set up GCP project
gcloud config set project YOUR_PROJECT_ID

# 3. Deploy with one command
chmod +x gcp-setup.sh
./gcp-setup.sh
```

### Local Development

```bash
# 1. Install frontend dependencies
npm install

# 2. Install backend dependencies
cd assistant_chatbot/backend
pip install -r requirements.txt

# 3. Start backend (in one terminal)
cd assistant_chatbot/backend
python -m uvicorn main:app --reload --port 8000

# 4. Start frontend (in another terminal)
npm run dev
```

## 📁 Project Structure

```
medical-assistant/
├── src/                          # React frontend source
├── assistant_chatbot/backend/    # FastAPI backend
├── database-setup/              # Database schema and setup
├── docs/                        # Documentation
├── scripts/                     # Utility scripts
├── public/                      # Static assets
├── Dockerfile                   # Container configuration
├── cloudbuild.yaml             # GCP build configuration
├── gcp-setup.sh               # Deployment script
├── gcp-cost-monitor.py        # Cost monitoring tool
└── README-DEPLOYMENT.md       # Detailed deployment guide
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
GOOGLE_API_KEY=your_google_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
ENVIRONMENT=production
```

### Database Setup

The application uses Supabase for data storage. Database schema and setup instructions are in the `database-setup/` directory.

## 📊 Monitoring

### Cost Monitoring
```bash
# Monitor current costs and usage
python gcp-cost-monitor.py --project YOUR_PROJECT_ID --requests 1000
```

### Application Monitoring
```bash
# View service logs
gcloud run services logs read medical-assistant --region us-central1

# Check service status
gcloud run services describe medical-assistant --region us-central1
```

### Health Checks
- Health endpoint: `GET /health`
- Task types: `GET /task-types`
- Session stats: `GET /sessions/stats`

## 🛠️ Development

### Backend Development
```bash
cd assistant_chatbot/backend

# Run tests
python -m pytest

# Start with hot reload
python -m uvicorn main:app --reload --port 8000
```

### Frontend Development
```bash
# Start development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

### Adding New Features

1. **Backend**: Add new tools in `assistant_chatbot/backend/tools.py`
2. **Frontend**: Add new components in `src/components/`
3. **AI Agents**: Configure in `assistant_chatbot/backend/task_config.py`

## 🔒 Security

- Environment variables stored in Google Secret Manager
- CORS configured for production domains
- Input validation on all endpoints
- Rate limiting via Cloud Run
- Structured logging for audit trails

## 📈 Scaling

The application is configured to:
- **Scale to zero** when not in use
- **Auto-scale** based on traffic
- **Handle high concurrency** (80 requests per instance)
- **Optimize costs** with minimal resource allocation

For higher traffic:
1. Increase max instances in `gcp-deploy.yaml`
2. Adjust CPU/memory limits as needed
3. Consider Cloud CDN for static assets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Troubleshooting
1. Check the [deployment guide](README-DEPLOYMENT.md)
2. View application logs: `gcloud run services logs read medical-assistant --region us-central1`
3. Test health endpoint: `curl https://YOUR_SERVICE_URL/health`
4. Monitor costs: `python gcp-cost-monitor.py --project YOUR_PROJECT_ID`

### Getting Help
- Check the `docs/` directory for detailed documentation
- Review the deployment guide for common issues
- Use the cost monitoring tool to track usage

---

**🎉 Built with ❤️ for accessible healthcare technology**

This application demonstrates how to build and deploy a production-ready AI assistant with minimal cost and maximum efficiency on Google Cloud Platform.