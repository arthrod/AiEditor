import { Editor, EditorEvents } from "@tiptap/core";
import { AiModelManager } from "../../ai/AiModelManager";
import { AiEditorOptions } from "../../core/AiEditor";
import { AbstractDropdownMenuButton } from "../AbstractDropdownMenuButton";

/**
 * Interface representing a provider and model combination
 */
export interface ProviderModelOption {
    providerId: string;
    providerName: string;
    modelId: string;
    modelName: string;
    description?: string;
}

/**
 * AiModelManager component for the toolbar
 * This component provides a unified interface for managing all AI models
 * across different providers in one dropdown
 */
export class AiModelManagerButton extends AbstractDropdownMenuButton<ProviderModelOption> {
    // List of all provider/model combinations
    private allModels: ProviderModelOption[] = [];
    private currentProvider: string = 'auto';
    private currentModelId: string = '';

    constructor() {
        super();
        this.dropDivHeight = "auto";
        this.dropDivWith = "280px";
        this.width = "auto";
        this.menuTextWidth = "auto";
        this.setAttribute('data-component', 'ai-model-manager');
        
        // Listen for model changes
        document.addEventListener('aie-model-changed', (event: CustomEvent) => {
            if (!event.detail) return;
            this.updateCurrentSelection(event.detail.provider, event.detail.model);
            this.updateTemplate();
        });
        
        // Listen for provider changes
        document.addEventListener('aie-provider-changed', (event: CustomEvent) => {
            if (!event.detail) return;
            this.currentProvider = event.detail.provider;
            this.updateTemplate();
        });
        
        // Listen for configuration changes
        document.addEventListener('aie-model-config-changed', (event: CustomEvent) => {
            if (!event.detail) return;
            this.updateCurrentSelection(event.detail.provider, event.detail.modelId);
            this.updateTemplate();
        });
    }

    /**
     * Update the current selection based on provider and model
     */
    private updateCurrentSelection(provider: string, modelId: string): void {
        this.currentProvider = provider;
        this.currentModelId = modelId;
        
        // Find the matching model in our list and update activeIndex
        const modelIndex = this.allModels.findIndex(
            model => model.providerId === provider && model.modelId === modelId
        );
        
        if (modelIndex >= 0) {
            this.activeIndex = modelIndex;
        }
    }

    onCreate(_: EditorEvents["create"], options: AiEditorOptions): void {
        super.onCreate(_, options);
        
        // Initialize available providers and models
        this.initializeModels(options);
        
        // Set the menu data
        this.menuData = this.allModels;
        
        // Set active model
        this.setActiveModel(options);
    }

    /**
     * Initialize all available models across providers
     */
    private initializeModels(options: AiEditorOptions): void {
        this.allModels = [];
        
        // Get all configured providers
        const providers = options.ai?.models ? Object.keys(options.ai.models) : [];
        
        // For each provider, get all available models
        providers.forEach(providerId => {
            if (providerId === 'auto') return;
            
            const providerConfig = options.ai?.models?.[providerId];
            if (!providerConfig) return;
            
            const providerName = this.getProviderDisplayName(providerId);
            
            // Add provider's predefined models based on type
            if (providerId === 'openai') {
                this.addOpenAIModels(providerId, providerName);
            } else if (providerId === 'openrouter') {
                this.addOpenRouterModels(providerId, providerName, providerConfig);
            } else if (providerId === 'spark') {
                this.addSparkModels(providerId, providerName);
            } else if (providerId === 'wenxin') {
                this.addWenxinModels(providerId, providerName);
            } else if (providerId === 'gitee') {
                this.addGiteeModels(providerId, providerName);
            }
            
            // Add any custom models defined in the configuration
            if (providerConfig.models && Array.isArray(providerConfig.models)) {
                providerConfig.models.forEach(model => {
                    this.allModels.push({
                        providerId,
                        providerName,
                        modelId: model.value,
                        modelName: model.name,
                        description: model.description
                    });
                });
            }
            
            // Add current model if not in the list
            const currentModelId = providerConfig.modelId || 
                (providerId === 'spark' ? providerConfig.version : providerConfig.model);
                
            if (currentModelId && !this.allModels.some(m => 
                m.providerId === providerId && m.modelId === currentModelId)) {
                this.allModels.push({
                    providerId,
                    providerName,
                    modelId: currentModelId,
                    modelName: this.getModelDisplayName(currentModelId),
                    description: 'Current model'
                });
            }
        });
        
        // Sort models: first by provider, then by name
        this.allModels.sort((a, b) => {
            if (a.providerId !== b.providerId) {
                return a.providerId.localeCompare(b.providerId);
            }
            return a.modelName.localeCompare(b.modelName);
        });
    }

    /**
     * Add OpenAI models
     */
    private addOpenAIModels(providerId: string, providerName: string): void {
        const openaiModels = [
            { id: 'gpt-4o', name: 'GPT-4o', description: 'Latest GPT-4 model with video capabilities' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Smaller, faster version of GPT-4o' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High performance GPT-4 model' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective model' }
        ];
        
        openaiModels.forEach(model => {
            this.allModels.push({
                providerId,
                providerName,
                modelId: model.id,
                modelName: model.name,
                description: model.description
            });
        });
    }

    /**
     * Add OpenRouter models
     */
    private addOpenRouterModels(providerId: string, providerName: string, config: any): void {
        // For OpenRouter, check if we have models in the configuration
        if (config.models && Array.isArray(config.models)) {
            config.models.forEach(model => {
                this.allModels.push({
                    providerId,
                    providerName,
                    modelId: model.value,
                    modelName: model.name,
                    description: model.description
                });
            });
        } else {
            // Default OpenRouter models
            const openRouterModels = [
                { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', description: 'Anthropic\'s most powerful model' },
                { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet', description: 'Balanced Claude model' },
                { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', description: 'Fast, efficient Claude model' },
                { id: 'google/gemini-pro', name: 'Gemini Pro', description: 'Google\'s Gemini Pro model' },
                { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B', description: 'Meta\'s largest Llama 3 model' },
                { id: 'deepseek-ai/deepseek-coder', name: 'DeepSeek Coder', description: 'DeepSeek\'s coding-focused model' },
                { id: 'deepseek-ai/deepseek-r1-zero:free', name: 'DeepSeek R1 Zero (Free)', description: 'Free tier DeepSeek R1 model' }
            ];
            
            openRouterModels.forEach(model => {
                this.allModels.push({
                    providerId,
                    providerName,
                    modelId: model.id,
                    modelName: model.name,
                    description: model.description
                });
            });
        }
    }

    /**
     * Add Spark models
     */
    private addSparkModels(providerId: string, providerName: string): void {
        const sparkModels = [
            { id: 'v4.0', name: 'Spark 4.0', description: 'Latest Spark model' },
            { id: 'v3.5', name: 'Spark 3.5', description: 'Balanced performance and cost' },
            { id: 'v3.1', name: 'Spark 3.1', description: 'Older Spark model' },
            { id: 'v2.1', name: 'Spark 2.1', description: 'Legacy Spark model' }
        ];
        
        sparkModels.forEach(model => {
            this.allModels.push({
                providerId,
                providerName,
                modelId: model.id,
                modelName: model.name,
                description: model.description
            });
        });
    }

    /**
     * Add Wenxin (ERNIE) models
     */
    private addWenxinModels(providerId: string, providerName: string): void {
        const wenxinModels = [
            { id: 'ernie-4.0', name: 'ERNIE 4.0', description: 'Baidu\'s latest ERNIE model' },
            { id: 'ernie-3.5-turbo', name: 'ERNIE 3.5 Turbo', description: 'Baidu\'s ERNIE 3.5 model' },
            { id: 'ernie-speed', name: 'ERNIE Speed', description: 'Fast ERNIE model' }
        ];
        
        wenxinModels.forEach(model => {
            this.allModels.push({
                providerId,
                providerName,
                modelId: model.id,
                modelName: model.name,
                description: model.description
            });
        });
    }

    /**
     * Add Gitee models
     */
    private addGiteeModels(providerId: string, providerName: string): void {
        const giteeModels = [
            { id: 'jc-2.0', name: 'JC-2.0', description: 'Gitee code model 2.0' },
            { id: 'jc-1.0', name: 'JC-1.0', description: 'Gitee code model 1.0' }
        ];
        
        giteeModels.forEach(model => {
            this.allModels.push({
                providerId,
                providerName,
                modelId: model.id,
                modelName: model.name,
                description: model.description
            });
        });
    }

    /**
     * Get a display name for a provider
     */
    private getProviderDisplayName(providerId: string): string {
        const providerNames = {
            'openai': 'OpenAI',
            'openrouter': 'OpenRouter',
            'spark': 'Spark',
            'wenxin': 'Wenxin',
            'gitee': 'Gitee',
            'custom': 'Custom'
        };
        
        return providerNames[providerId] || providerId.charAt(0).toUpperCase() + providerId.slice(1);
    }

    /**
     * Get a display name for a model ID
     */
    private getModelDisplayName(modelId: string): string {
        // For paths like 'deepseek-ai/deepseek-r1-zero:free'
        if (modelId.includes('/')) {
            const parts = modelId.split('/');
            const modelName = parts[parts.length - 1];
            return modelName.charAt(0).toUpperCase() + modelName.slice(1);
        }
        
        return modelId.toUpperCase();
    }

    /**
     * Set the active model based on configuration
     */
    private setActiveModel(options: AiEditorOptions): void {
        if (!options.ai?.models) return;
        
        // Get current provider
        this.currentProvider = options.ai.bubblePanelModel || 'auto';
        
        // If auto, find the first available provider
        if (this.currentProvider === 'auto') {
            const providers = Object.keys(options.ai.models);
            if (providers.length > 0) {
                this.currentProvider = providers[0];
            }
        }
        
        // Get current model ID
        const providerConfig = options.ai.models[this.currentProvider];
        if (!providerConfig) return;
        
        this.currentModelId = providerConfig.modelId || 
            (this.currentProvider === 'spark' ? providerConfig.version : providerConfig.model);
        
        // Find the matching model in our list
        const modelIndex = this.allModels.findIndex(
            model => model.providerId === this.currentProvider && model.modelId === this.currentModelId
        );
        
        if (modelIndex >= 0) {
            this.activeIndex = modelIndex;
        } else {
            this.activeIndex = 0;
        }
    }

    /**
     * Get the text to display in the dropdown button
     */
    getMenuText(): string {
        if (this.allModels.length === 0) {
            return "Models";
        }
        
        const activeModel = this.allModels[this.activeIndex];
        if (!activeModel) {
            return "Models";
        }
        
        return "Models";
    }

    /**
     * Custom template rendering
     */
    renderTemplate(): string {
        const settingsIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
        </svg>`;
        
        // Create a highlighted button style to make it more noticeable
        this.template = `
        <div>
            <div style="display: flex; align-items: center; gap: 6px; padding: 0 8px; background-color: #f0f8ff; border-radius: 4px; border: 1px solid #d0e8ff;" id="tippy">
                <span style="display:flex;text-align:center;overflow: hidden;" id="text">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="height: 16px;">${settingsIcon}</div>
                        <span style="font-size: 13px; color: #4285f4; font-weight: 500;">AI Models</span>
                    </div>
                </span>
                <div style="display: flex;justify-content: center;align-items: center;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path fill="none" d="M0 0h24v24H0z"></path><path d="M12 14L8 10H16L12 14Z"></path>
                    </svg>
                </div>
            </div>
        </div>
        `;
        
        return this.template;
    }

    /**
     * Check if dropdown should be active
     */
    onDropdownActive(_editor: Editor, _index: number): boolean {
        return this.allModels.length > 0;
    }

    /**
     * Handler for dropdown item click
     */
    onDropdownItemClick(index: number): void {
        if (index < 0 || index >= this.allModels.length) return;
        
        const selectedModel = this.allModels[index];
        if (!selectedModel || !this.editor?.aiEditor?.options?.ai?.models) return;
        
        // Get or create provider config
        const providerConfig = this.editor.aiEditor.options.ai.models[selectedModel.providerId] || {};
        
        // Set the universal modelId field
        providerConfig.modelId = selectedModel.modelId;
        
        // Also update provider-specific fields for backward compatibility
        if (selectedModel.providerId === 'openai' || selectedModel.providerId === 'openrouter' || selectedModel.providerId === 'gitee') {
            providerConfig.model = selectedModel.modelId;
        } else if (selectedModel.providerId === 'spark') {
            providerConfig.version = selectedModel.modelId;
        } else if (selectedModel.providerId === 'wenxin') {
            providerConfig.model = selectedModel.modelId;
        }
        
        // Update configuration
        this.editor.aiEditor.options.ai.models[selectedModel.providerId] = providerConfig;
        
        // Update the model instance
        const model = AiModelManager.get(selectedModel.providerId);
        if (model) {
            // Update universal modelId
            model.aiModelConfig.modelId = selectedModel.modelId;
            
            // Also update provider-specific fields
            if (selectedModel.providerId === 'openai' || selectedModel.providerId === 'openrouter' || selectedModel.providerId === 'gitee') {
                model.aiModelConfig.model = selectedModel.modelId;
            } else if (selectedModel.providerId === 'spark') {
                model.aiModelConfig.version = selectedModel.modelId;
            } else if (selectedModel.providerId === 'wenxin') {
                model.aiModelConfig.model = selectedModel.modelId;
            }
        }
        
        // Also update current provider
        if (this.editor.aiEditor.options.ai.bubblePanelModel !== selectedModel.providerId) {
            this.editor.aiEditor.options.ai.bubblePanelModel = selectedModel.providerId;
            
            // Dispatch provider changed event
            const providerEvent = new CustomEvent('aie-provider-changed', {
                detail: {
                    provider: selectedModel.providerId
                },
                bubbles: true,
                composed: true
            });
            document.dispatchEvent(providerEvent);
        }
        
        // Update active index
        this.activeIndex = index;
        this.currentProvider = selectedModel.providerId;
        this.currentModelId = selectedModel.modelId;
        
        // Dispatch events for other components
        // First, dispatch model changed event
        const modelChangedEvent = new CustomEvent('aie-model-changed', {
            detail: {
                provider: selectedModel.providerId,
                model: selectedModel.modelId,
                displayName: selectedModel.modelName
            },
            bubbles: true,
            composed: true
        });
        document.dispatchEvent(modelChangedEvent);
        
        // Then, dispatch configuration changed event
        const configChangedEvent = new CustomEvent('aie-model-config-changed', {
            detail: {
                provider: selectedModel.providerId,
                modelId: selectedModel.modelId,
                config: providerConfig,
                source: 'ai-model-manager',
                changeType: 'model-selection'
            },
            bubbles: true,
            composed: true
        });
        document.dispatchEvent(configChangedEvent);
        
        // Update UI
        this.updateTemplate();
    }

    /**
     * Render a dropdown item
     */
    onDropdownItemRender(index: number): Element | string {
        const model = this.allModels[index];
        const isActive = index === this.activeIndex;
        
        return `
        <div style="display: flex; flex-direction: column; padding: 6px 0; border-bottom: ${index < this.allModels.length - 1 && this.allModels[index + 1].providerId !== model.providerId ? '1px solid #eee' : 'none'};">
            <div style="display: flex; align-items: center; gap: 8px; justify-content: space-between;">
                <div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="font-weight: ${isActive ? 'bold' : 'normal'};">${model.modelName}</span>
                        ${isActive ? '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>' : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="font-size: 10px; color: #666; background: #f2f2f2; padding: 1px 4px; border-radius: 3px;">${model.providerName}</span>
                        ${model.description ? `<span style="font-size: 11px; color: #666;">${model.description}</span>` : ''}
                    </div>
                </div>
            </div>
        </div>
        `;
    }
}

// Register the custom element
customElements.define('aie-model-manager', AiModelManagerButton); 