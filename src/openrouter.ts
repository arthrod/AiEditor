// OpenRouter configuration
export const openrouter = {
  endpoint: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  siteUrl: window.location.origin || 'http://localhost:5174', // Use actual origin if available
  siteName: 'AiEditor', // For rankings on openrouter.ai
  model: 'deepseek/deepseek-r1-zero:free', // Set DeepSeek R1 Zero as the default model
  fallbackModel: 'anthropic/claude-instant-1:free', // Fallback to Claude Instant if primary model fails
  models: [
    { name: 'DeepSeek R1 Zero (Free)', value: 'deepseek/deepseek-r1-zero:free' },
    { name: 'Claude Instant (Free)', value: 'anthropic/claude-instant-1:free' },
    { name: 'GPT-4o', value: 'openai/gpt-4o' },
    { name: 'Claude 3 Opus', value: 'anthropic/claude-3-opus' },
    { name: 'Llama 3 70B', value: 'meta-llama/llama-3-70b-instruct' },
    { name: 'Mistral Large', value: 'mistralai/mistral-large-latest' },
    // Add more models as needed
  ]
}; 