# API Key Configuration

AIEditor can connect to various AI services to provide AI-powered editing features. To use these features, you'll need to configure API keys for the services you want to use.

## Setting Up API Keys

1. Create a `.env` file in the root directory of the project (this file should never be committed to Git)
2. Add your API keys to the `.env` file following the format in `.env.example`
3. Restart the application if it's already running

Example `.env` file:
```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxxxxxxxxxxxxx
```

## Supported AI Services

AIEditor supports the following AI services:

- OpenAI (ChatGPT)
- OpenRouter (for accessing multiple models)
- Spark
- Wenxin (Baidu)
- Xinghuo (iFlytek)

## Using Custom AI Services

You can also configure custom AI services by:

1. Adding the appropriate API keys to your `.env` file
2. Modifying the AI service configuration in your application

## Security Considerations

- Never commit API keys to your Git repository
- Use environment variables for all sensitive credentials
- For deployment, use your platform's secure environment variable storage
  - GitHub Actions: Use repository secrets
  - Vercel/Netlify: Use their environment variable configuration
  - Docker: Use Docker secrets or environment variables

## GitHub Actions

If you're using GitHub Actions for CI/CD, you'll need to set up secrets in your GitHub repository:

1. Go to your repository on GitHub
2. Click Settings → Secrets and Variables → Actions
3. Click "New repository secret"
4. Add your API keys as secrets (e.g., `OPENAI_API_KEY`, `OPENROUTER_API_KEY`)
5. Reference these secrets in your GitHub workflow files 