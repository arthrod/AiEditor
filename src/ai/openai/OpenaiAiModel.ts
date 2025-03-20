import { InnerEditor } from "../../core/AiEditor.ts";
import { AiGlobalConfig } from "../AiGlobalConfig.ts";
import { AiClient } from "../core/AiClient.ts";
import { AiMessageListener } from "../core/AiMessageListener.ts";
import { AiModel } from "../core/AiModel.ts";
import { SseClient } from "../core/client/sse/SseClient.ts";
import { OpenaiModelConfig } from "./OpenaiModelConfig.ts";


export class OpenaiAiModel extends AiModel {

    constructor(editor: InnerEditor, globalConfig: AiGlobalConfig) {
        super(editor, globalConfig, "openai");
        this.aiModelConfig = {
            endpoint: "https://api.openai.com",
            // model: "gpt-3.5-turbo",
            ...globalConfig.models["openai"]
        } as OpenaiModelConfig;
        
        // If modelId is specified, use it to override the model field for consistency
        if (this.aiModelConfig.modelId) {
            this.aiModelConfig.model = this.aiModelConfig.modelId;
        }
    }

    createAiClient(url: string, listener: AiMessageListener): AiClient {
        const config = this.aiModelConfig as OpenaiModelConfig;
        const headers = {
            "Content-Type": "application/json",
        } as any
        if (config.apiKey) {
            headers["Authorization"] = `Bearer ${config.apiKey}`;
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
                })
                //通知 ai 消费情况
                if (this.globalConfig.onTokenConsume && message.choices[0].usage?.["total_tokens"]) {
                    this.globalConfig.onTokenConsume(this.aiModelName, this.aiModelConfig!, message.choices[0].usage["total_tokens"])
                }
            }
        });
    }

    wrapPayload(prompt: string) {
        const config = this.aiModelConfig as OpenaiModelConfig;
        const payload = {
            "messages": [
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            "max_tokens": config.maxTokens || null,
            "temperature": config.temperature || null,
            "stream": true
        } as any

        // Use modelId if available, otherwise fall back to model field
        const modelToUse = config.modelId || config.model;
        if (modelToUse) {
            payload.model = modelToUse;
        }

        return JSON.stringify(payload);
    }

    createAiClientUrl(): string {
        const config = this.aiModelConfig as OpenaiModelConfig;
        if (config.customUrl) {
            if (typeof config.customUrl === "string") {
                return config.customUrl;
            } else if (typeof config.customUrl === "function") {
                return config.customUrl();
            }
        }

        return `${config.endpoint}/v1/chat/completions`;
    }


}
