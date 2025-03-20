import { AiModelConfig } from "../core/AiModelConfig.ts";

/**
 * Interface for a model option in the UI
 */
export interface ModelOption {
    name: string;
    value: string;
    description?: string;
}

export interface OpenRouterModelConfig extends AiModelConfig {
    endpoint: string;
    apiKey: string;
    siteUrl?: string;
    siteName?: string;
    model: string; // The specific model to use via OpenRouter (e.g., 'openai/gpt-4o')
    temperature?: number;
    maxTokens?: number;
    models?: ModelOption[]; // Available models for selection
}

/**
 * Default models available through OpenRouter
 */
export const DEFAULT_OPENROUTER_MODELS: ModelOption[] = [
    { name: 'GPT-4o', value: 'openai/gpt-4o', description: 'Latest GPT-4 model with video capabilities' },
    { name: 'GPT-4o Mini', value: 'openai/gpt-4o-mini', description: 'Smaller, faster version of GPT-4o' },
    { name: 'GPT-4 Turbo', value: 'openai/gpt-4-turbo', description: 'High performance GPT-4 model' },
    { name: 'Claude 3 Opus', value: 'anthropic/claude-3-opus', description: 'Anthropic\'s most powerful model' },
    { name: 'Claude 3 Sonnet', value: 'anthropic/claude-3-sonnet', description: 'Balanced Claude model' },
    { name: 'Claude 3 Haiku', value: 'anthropic/claude-3-haiku', description: 'Fast, efficient Claude model' },
    { name: 'Gemini Pro', value: 'google/gemini-pro', description: 'Google\'s Gemini Pro model' },
    { name: 'Llama 3 70B', value: 'meta-llama/llama-3-70b-instruct', description: 'Meta\'s largest Llama 3 model' },
    { name: 'DEEPSEEK Coder', value: 'deepseek-ai/deepseek-coder', description: 'DeepSeek\'s coding-focused model' },
    { name: 'DEEPSEEK-R1-ZERO:FREE', value: 'deepseek-ai/deepseek-r1-zero:free', description: 'Free tier DeepSeek R1 model' }
]; 