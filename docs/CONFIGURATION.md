# Supabase Configuration Guide

This document provides comprehensive instructions for configuring the Supabase integration in different environments.

## Overview

The application uses Supabase for authentication and database functionality. Proper configuration is required for the application to work correctly in all environments.

## Required Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes | `https://abcdefghijklmnop.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Yes | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## Development Setup

### 1. Create a Supabase Project

1. Visit [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Choose your organization and fill in project details
5. Wait for the project to be fully initialized (this may take a few minutes)

### 2. Get Your Credentials

1. Go to your project dashboard
2. Navigate to **Settings** > **API**
3. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

### 3. Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important Notes:**
- Use `.env.local` for development (this file is ignored by git)
- Never commit real credentials to version control
- Variable names must start with `VITE_` to be available in the browser
- No spaces around the `=` sign

### 4. Restart Development Server

After creating the `.env.local` file:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
# or
yarn dev
```

### 5. Verify Configuration

1. Check the configuration status indicator in the bottom-right corner of the app
2. Open browser console and run: `testSupabaseSetup()`
3. Look for green checkmarks indicating successful configuration

## Production Deployment

### Environment Variables Setup

Set the following environment variables in your hosting platform:

- `VITE_SUPABASE_URL`: Your production Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your production Supabase anon key

### Platform-Specific Instructions

#### Vercel

1. Go to your project dashboard on Vercel
2. Navigate to **Settings** > **Environment Variables**
3. Add both variables for **Production**, **Preview**, and **Development** environments
4. Redeploy your application

#### Netlify

1. Go to your site dashboard on Netlify
2. Navigate to **Site Settings** > **Environment Variables**
3. Add both variables
4. Trigger a new deploy

#### Railway

1. Go to your project on Railway
2. Navigate to **Variables** tab
3. Add both environment variables
4. Railway will automatically redeploy

#### Render

1. Go to your service dashboard on Render
2. Navigate to **Environment** tab
3. Add both environment variables
4. Render will automatically redeploy

### Production Checklist

- [ ] Environment variables are set correctly
- [ ] Supabase project is in production mode (not paused)
- [ ] Database migrations are applied
- [ ] Row Level Security (RLS) policies are enabled
- [ ] HTTPS is enforced
- [ ] Domain is configured correctly

## Environment-Specific Configuration

### Development
- Uses `.env.local` file
- Provides detailed error messages and setup guidance
- Shows configuration status indicator
- Enables debug utilities in browser console

### Production
- Uses platform environment variables
- Fails gracefully with limited functionality if misconfigured
- Logs errors for monitoring
- Optimized for performance

### Testing
- Can use separate Supabase project for testing
- Environment variables can be set in test configuration
- Supports mocking for unit tests

## Troubleshooting

### Common Issues

#### "VITE_SUPABASE_URL is missing"
**Cause:** Environment variable not set or not accessible

**Solutions:**
- Ensure `.env.local` file exists in project root
- Check variable name spelling (must be exact)
- Restart development server after adding variables
- In production, verify environment variables are set in hosting platform

#### "Invalid URL format"
**Cause:** Malformed Supabase URL

**Solutions:**
- Ensure URL starts with `https://`
- Verify URL ends with `.supabase.co`
- Copy URL directly from Supabase dashboard
- Example: `https://abcdefghijklmnop.supabase.co`

#### "Connection failed"
**Cause:** Cannot connect to Supabase

**Solutions:**
- Check if Supabase project is active (not paused)
- Verify network connectivity
- Ensure API keys are correct and not expired
- Check Supabase status page for outages

#### "Environment variables not loading"
**Cause:** Variables not accessible to Vite

**Solutions:**
- Ensure variable names start with `VITE_` prefix
- No spaces around `=` in `.env.local`
- Restart development server
- Check file is named `.env.local` (not `.env`)

#### "Anon key appears invalid"
**Cause:** Wrong key or malformed key

**Solutions:**
- Copy the **anon/public** key, not the service role key
- Ensure complete key is copied (they're quite long)
- Verify no extra spaces or characters

### Debug Tools

In development mode, the following tools are available in the browser console:

```javascript
// Test complete Supabase setup
testSupabaseSetup()

// Show configuration help
showSupabaseHelp()

// Check configuration status
supabaseConfigHelp.checkConfig()

// Show setup instructions
supabaseConfigHelp.showSetupInstructions()

// Show troubleshooting guide
supabaseConfigHelp.showTroubleshooting()
```

## Security Considerations

### Development
- `.env.local` files are ignored by git (never committed)
- Anon keys are safe for client-side use
- Use development Supabase project for local development

### Production
- Environment variables are set securely in hosting platform
- HTTPS is enforced for all connections
- Row Level Security (RLS) protects data access
- Regular security audits of Supabase configuration

### Best Practices
- Use separate Supabase projects for development, staging, and production
- Regularly rotate API keys
- Monitor Supabase logs for suspicious activity
- Keep Supabase client library updated
- Enable database backups

## Migration Guide

### From Mock Authentication
If migrating from mock authentication:

1. Set up Supabase project and configuration
2. Run database migrations
3. Update authentication forms to use Supabase
4. Test authentication flow thoroughly
5. Deploy with proper environment variables

### Between Environments
When moving between environments:

1. Create new Supabase project for target environment
2. Apply database schema and migrations
3. Update environment variables
4. Test all functionality
5. Update DNS/domain configuration if needed

## Support

### Getting Help
- Check browser console for detailed error messages
- Use debug tools in development mode
- Review Supabase dashboard for project status
- Check Supabase documentation: https://supabase.com/docs

### Reporting Issues
When reporting configuration issues, include:
- Environment (development/production)
- Error messages from browser console
- Configuration status from debug tools
- Steps to reproduce the issue

---

For more information about Supabase features and configuration, visit the [official Supabase documentation](https://supabase.com/docs).