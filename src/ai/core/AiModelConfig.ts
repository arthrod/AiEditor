export interface AiModelConfig {
    temperature?: number;
    maxTokens?: number;
    modelId?: string; // Universal model identifier that works across providers
}
