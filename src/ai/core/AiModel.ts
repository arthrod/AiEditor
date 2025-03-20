import { InnerEditor } from "../../core/AiEditor.ts";
import { AiGlobalConfig } from "../AiGlobalConfig.ts";
import { AiClient } from "./AiClient.ts";
import { AiMessageListener } from "./AiMessageListener.ts";
import { AiModelConfig } from "./AiModelConfig.ts";


export abstract class AiModel {

    public editor: InnerEditor;
    public globalConfig: AiGlobalConfig;
    public aiModelName: string;
    public aiModelConfig: AiModelConfig;

    protected constructor(editor: InnerEditor, globalConfig: AiGlobalConfig, aiModelName: string) {
        this.editor = editor;
        this.globalConfig = globalConfig;
        this.aiModelName = aiModelName;
        this.aiModelConfig = globalConfig.models[aiModelName] || {};
        
        // Handle universal modelId field for consistency across providers
        this.syncModelIdWithProviderSpecificFields();
    }

    /**
     * Synchronize the universal modelId with provider-specific model fields
     * This ensures consistent model handling across different providers
     */
    protected syncModelIdWithProviderSpecificFields(): void {
        if (!this.aiModelConfig) return;
        
        let configChanged = false;
        
        // If modelId is specified, use it to set provider-specific fields
        if (this.aiModelConfig.modelId) {
            // OpenAI, OpenRouter, Gitee use 'model' field
            if (this.aiModelName === 'openai' || this.aiModelName === 'openrouter' || this.aiModelName === 'gitee') {
                if (this.aiModelConfig.model !== this.aiModelConfig.modelId) {
                    this.aiModelConfig.model = this.aiModelConfig.modelId;
                    configChanged = true;
                }
            } 
            // Spark uses 'version' field
            else if (this.aiModelName === 'spark') {
                if (this.aiModelConfig.version !== this.aiModelConfig.modelId) {
                    this.aiModelConfig.version = this.aiModelConfig.modelId;
                    configChanged = true;
                }
            }
            // Wenxin uses 'model' field
            else if (this.aiModelName === 'wenxin') {
                if (this.aiModelConfig.model !== this.aiModelConfig.modelId) {
                    this.aiModelConfig.model = this.aiModelConfig.modelId;
                    configChanged = true;
                }
            }
        } 
        // If no modelId but provider-specific field exists, set modelId for consistency
        else {
            if (this.aiModelName === 'openai' || this.aiModelName === 'openrouter' || this.aiModelName === 'gitee') {
                if (this.aiModelConfig.model && this.aiModelConfig.modelId !== this.aiModelConfig.model) {
                    this.aiModelConfig.modelId = this.aiModelConfig.model;
                    configChanged = true;
                }
            } else if (this.aiModelName === 'spark') {
                if (this.aiModelConfig.version && this.aiModelConfig.modelId !== this.aiModelConfig.version) {
                    this.aiModelConfig.modelId = this.aiModelConfig.version;
                    configChanged = true;
                }
            } else if (this.aiModelName === 'wenxin') {
                if (this.aiModelConfig.model && this.aiModelConfig.modelId !== this.aiModelConfig.model) {
                    this.aiModelConfig.modelId = this.aiModelConfig.model;
                    configChanged = true;
                }
            }
        }
        
        // If configuration changed, dispatch event
        if (configChanged) {
            const event = new CustomEvent('aie-model-config-changed', {
                detail: {
                    provider: this.aiModelName,
                    modelId: this.aiModelConfig.modelId,
                    config: this.aiModelConfig
                },
                bubbles: true,
                composed: true
            });
            document.dispatchEvent(event);
        }
    }

    chatWithPayload(payload: any, listener: AiMessageListener): void {
        const onSuccess = (url: string) => {
            const aiClient = this.createAiClient(url, listener);
            aiClient.start(typeof payload === "string" ? payload : JSON.stringify(payload))
        }
        const onFailure = () => {
            listener?.onStop();
        }

        if (this.globalConfig.onCreateClientUrl) {
            this.globalConfig.onCreateClientUrl(this.aiModelName, this.aiModelConfig, onSuccess, onFailure)
        } else {
            onSuccess(this.createAiClientUrl())
        }
    }


    chat(selectedText: string, prompt: string, listener: AiMessageListener): void {
        const onSuccess = (url: string) => {
            const aiClient = this.createAiClient(url, listener);
            const finalPrompt = prompt.includes("{content}") ? prompt.split('{content}').join(selectedText) : `${selectedText ? selectedText + "\n" : ""}${prompt}`
            const payload = this.wrapPayload(finalPrompt);
            aiClient.start(typeof payload === "string" ? payload : JSON.stringify(payload))
        }

        const onFailure = () => {
            listener?.onStop();
        }

        if (this.globalConfig.onCreateClientUrl) {
            this.globalConfig.onCreateClientUrl(this.aiModelName, this.aiModelConfig, onSuccess, onFailure)
        } else {
            onSuccess(this.createAiClientUrl())
        }
    }


    /**
     * 创建客户端链接 URL
     */
    abstract createAiClientUrl(): string;

    /**
     * 创建客户端
     */
    abstract createAiClient(url: string, listener: AiMessageListener): AiClient;

    /**
     * 封装消息，把 prompt 转换为协议需要的格式
     * @param prompt
     */
    abstract wrapPayload(prompt: string): any;


}