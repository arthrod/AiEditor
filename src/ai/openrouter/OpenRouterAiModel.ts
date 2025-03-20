import { InnerEditor } from "../../core/AiEditor.ts";
import { AiGlobalConfig } from "../AiGlobalConfig.ts";
import { AiClient } from "../core/AiClient.ts";
import { AiMessageListener } from "../core/AiMessageListener.ts";
import { AiModel } from "../core/AiModel.ts";
import { SseClient } from "../core/client/sse/SseClient.ts";
import { DEFAULT_OPENROUTER_MODELS, OpenRouterModelConfig } from "./OpenRouterModelConfig.ts";

export class OpenRouterAiModel extends AiModel {
    constructor(editor: InnerEditor, globalConfig: AiGlobalConfig) {
        super(editor, globalConfig, "openrouter");
        
        // Merge default configuration with provided configuration
        const providedConfig = globalConfig.models["openrouter"] || {};
        
        this.aiModelConfig = {
            endpoint: "https://openrouter.ai/api/v1",
            model: "meta-llama/llama-3-8b-instruct",
            siteUrl: window.location.href,
            siteName: document.title,
            // If no models are provided, use the default list
            models: providedConfig.models || DEFAULT_OPENROUTER_MODELS,
            ...providedConfig
        } as OpenRouterModelConfig;
        
        // If modelId is specified, use it to override the model field for consistency
        if (this.aiModelConfig.modelId) {
            this.aiModelConfig.model = this.aiModelConfig.modelId;
        }
    }

    createAiClient(url: string, listener: AiMessageListener): AiClient {
        const config = this.aiModelConfig as OpenRouterModelConfig;
        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.apiKey}`,
        } as any;

        // Add OpenRouter specific headers if provided
        if (config.siteUrl) {
            headers["HTTP-Referer"] = config.siteUrl;
        }
        if (config.siteName) {
            headers["X-Title"] = config.siteName;
        }

        return new SseClient({
            url,
            method: "post",
            headers,
        }, {
            onStart: listener.onStart,
            onStop: listener.onStop,
            onMessage: (bodyString: string) => {
                let message = null;
                try {
                    message = JSON.parse(bodyString);
                } catch (err) {
                    console.error("error", err, bodyString);
                    return;
                }

                if (!message.choices || message.choices.length === 0) {
                    return;
                }

                listener.onMessage({
                    status: message.choices[0].finish_reason === "stop" ? 2 : 1,
                    role: "assistant",
                    content: message.choices[0].delta?.content || "",
                    index: message.choices[0].index,
                });

                // Notify about token consumption
                if (this.globalConfig.onTokenConsume && message.usage?.total_tokens) {
                    this.globalConfig.onTokenConsume(
                        this.aiModelName, 
                        this.aiModelConfig!, 
                        message.usage.total_tokens
                    );
                }
            }
        });
    }

    wrapPayload(prompt: string) {
        const config = this.aiModelConfig as OpenRouterModelConfig;
        
        // Use modelId if available, otherwise fall back to model field
        const modelToUse = config.modelId || config.model || "deepseek/deepseek-r1-zero:free";
        
        const payload = {
            "model": modelToUse,
            "messages": [
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            "max_tokens": config.maxTokens || null,
            "temperature": config.temperature || 0.7,
            "stream": true
        };

        return JSON.stringify(payload);
    }

    createAiClientUrl(): string {
        const config = this.aiModelConfig as OpenRouterModelConfig;
        // Make sure we're using the correct endpoint without duplication
        // The endpoint in the constructor is set to "https://openrouter.ai/api/v1"
        return `${config.endpoint}/chat/completions`;
    }
} 