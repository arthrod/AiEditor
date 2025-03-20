import { Editor, EditorEvents } from "@tiptap/core";
import { AiModelManager } from "../../ai/AiModelManager";
import { AiEditorOptions } from "../../core/AiEditor";
import { AbstractDropdownMenuButton } from "../AbstractDropdownMenuButton";

/**
 * Interface representing an AI model option
 */
export interface AIModelOption {
    id: string;
    name: string;
    provider: string;
    description?: string;
}

/**
 * ModelSelector component for the toolbar
 * This component allows users to select which specific AI model to use within a provider
 */
export class ModelSelector extends AbstractDropdownMenuButton<AIModelOption> {
    // Map of provider-specific models
    private providerModels: Record<string, AIModelOption[]> = {
        'openai': [
            { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Latest GPT-4 model with video capabilities' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', description: 'Smaller, faster version of GPT-4o' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', description: 'High performance GPT-4 model' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', description: 'Fast and cost-effective model' }
        ],
        'openrouter': [
            { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'openrouter', description: 'Anthropic\'s most powerful model' },
            { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'openrouter', description: 'Balanced Claude model' },
            { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'openrouter', description: 'Fast, efficient Claude model' },
            { id: 'google/gemini-pro', name: 'Gemini Pro', provider: 'openrouter', description: 'Google\'s Gemini Pro model' },
            { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B', provider: 'openrouter', description: 'Meta\'s largest Llama 3 model' },
            { id: 'deepseek-ai/deepseek-coder', name: 'DeepSeek Coder', provider: 'openrouter', description: 'DeepSeek\'s coding-focused model' },
            { id: 'deepseek-ai/deepseek-r1-zero:free', name: 'DEEPSEEK-R1-ZERO:FREE', provider: 'openrouter', description: 'Free tier DeepSeek R1 model' }
        ],
        'spark': [
            { id: 'v4.0', name: 'Spark 4.0', provider: 'spark', description: 'Latest Spark model' },
            { id: 'v3.5', name: 'Spark 3.5', provider: 'spark', description: 'Balanced performance and cost' },
            { id: 'v3.1', name: 'Spark 3.1', provider: 'spark', description: 'Older Spark model' },
            { id: 'v2.1', name: 'Spark 2.1', provider: 'spark', description: 'Legacy Spark model' }
        ],
        'wenxin': [
            { id: 'ernie-4.0', name: 'ERNIE 4.0', provider: 'wenxin', description: 'Baidu\'s latest ERNIE model' },
            { id: 'ernie-3.5-turbo', name: 'ERNIE 3.5 Turbo', provider: 'wenxin', description: 'Baidu\'s ERNIE 3.5 model' },
            { id: 'ernie-speed', name: 'ERNIE Speed', provider: 'wenxin', description: 'Fast ERNIE model' }
        ],
        'gitee': [
            { id: 'jc-2.0', name: 'JC-2.0', provider: 'gitee', description: 'Gitee code model 2.0' },
            { id: 'jc-1.0', name: 'JC-1.0', provider: 'gitee', description: 'Gitee code model 1.0' }
        ],
        'custom': []
    };

    // Currently available models filtered by selected provider
    private availableModels: AIModelOption[] = [];
    private currentProvider: string = 'auto';

    constructor() {
        super();
        this.dropDivHeight = "auto";
        this.dropDivWith = "250px";
        this.width = "auto";
        this.menuTextWidth = "auto";
        this.setAttribute('data-component', 'model-selector');
    }

    onCreate(_: EditorEvents["create"], options: AiEditorOptions): void {
        super.onCreate(_, options);
        
        // Get the current provider
        this.currentProvider = options.ai?.bubblePanelModel || 'auto';
        
        // Update available models based on current provider
        this.updateModelsForProvider(this.currentProvider);
        
        // Set the active model if available
        this.setActiveModel();
        
        // Subscribe to provider changes
        this.subscribeToProviderChanges();
    }

    /**
     * Set the active model based on configuration
     */
    private setActiveModel(): void {
        if (!this.editor?.aiEditor?.options?.ai?.models) return;
        
        const currentProviderConfig = this.editor.aiEditor.options.ai.models[this.currentProvider];
        if (!currentProviderConfig) return;
        
        // First check if we have a universal modelId
        let modelId: string | undefined = currentProviderConfig.modelId;
        
        // If no universal modelId, fall back to provider-specific fields
        if (!modelId) {
            if (this.currentProvider === 'openai' || this.currentProvider === 'openrouter' || this.currentProvider === 'gitee') {
                modelId = currentProviderConfig.model;
            } else if (this.currentProvider === 'spark') {
                modelId = currentProviderConfig.version;
            } else if (this.currentProvider === 'wenxin') {
                modelId = currentProviderConfig.model || 'ernie-4.0';
            }
        }
        
        if (modelId && this.availableModels.length > 0) {
            const activeModel = this.availableModels.find(m => m.id === modelId);
            if (activeModel) {
                this.activeIndex = this.availableModels.indexOf(activeModel);
            } else {
                // If we don't find the model in predefined list, add it dynamically
                this.availableModels.push({
                    id: modelId,
                    name: this.getDisplayNameForModel(modelId),
                    provider: this.currentProvider,
                    description: 'Custom model'
                });
                this.activeIndex = this.availableModels.length - 1;
            }
        } else {
            this.activeIndex = 0;
        }
        
        this.menuData = this.availableModels;
        this.updateTemplate();
    }

    /**
     * Generate a display name for a model ID
     */
    private getDisplayNameForModel(modelId: string): string {
        // For paths like 'deepseek-ai/deepseek-r1-zero:free'
        if (modelId.includes('/')) {
            const parts = modelId.split('/');
            const modelName = parts[parts.length - 1];
            return modelName.toUpperCase();
        }
        
        return modelId.toUpperCase();
    }

    /**
     * Force a refresh of the model display
     */
    public refreshDisplay(): void {
        this.setActiveModel();
        this.updateTemplate();
        
        // Force a UI update to ensure changes are reflected
        if (this.textEl) {
            // Force a redraw by toggling display
            this.textEl.style.display = 'none';
            // Trigger DOM reflow
            void this.textEl.offsetHeight;
            // Restore display
            this.textEl.style.display = '';
        }
    }

    /**
     * Subscribe to provider selection changes
     */
    private subscribeToProviderChanges(): void {
        if (!this.editor) return;
        
        // Add event listener to detect provider changes
        document.addEventListener('aie-provider-changed', (event: CustomEvent) => {
            if (!event.detail) return;
            
            const newProvider = event.detail.provider;
            if (newProvider !== this.currentProvider) {
                this.currentProvider = newProvider;
                this.updateModelsForProvider(newProvider);
                this.setActiveModel();
                this.refreshDisplay();
            }
        });

        // Listen for model configuration changes
        document.addEventListener('aie-model-config-changed', (event: CustomEvent) => {
            if (!event.detail) return;
            
            // Only refresh if the event is for our current provider 
            // or affects the currently selected model
            if (event.detail.provider === this.currentProvider) {
                this.refreshDisplay();
            }
        });
        
        // Also listen for model changes
        document.addEventListener('aie-model-changed', (event: CustomEvent) => {
            if (!event.detail) return;
            
            // Only refresh if the event is for our current provider
            if (event.detail.provider === this.currentProvider) {
                this.refreshDisplay();
            }
        });
    }

    /**
     * Update available models based on selected provider
     */
    private updateModelsForProvider(provider: string): void {
        if (provider === 'auto') {
            // If 'auto', use the first available provider
            const firstProvider = Object.keys(this.providerModels)[0] || 'openai';
            this.availableModels = this.providerModels[firstProvider] || [];
        } else {
            // Get models for the selected provider
            this.availableModels = this.providerModels[provider] || [];
        }
        
        // Also get custom models from any custom configuration
        if (this.editor?.aiEditor?.options?.ai?.models?.[provider]?.models) {
            const customModels = this.editor.aiEditor.options.ai.models[provider].models;
            if (Array.isArray(customModels)) {
                // Add custom models to available models
                this.availableModels = [
                    ...this.availableModels,
                    ...customModels.map(m => ({
                        id: m.value,
                        name: m.name,
                        provider: provider,
                        description: m.description
                    }))
                ];
            }
        }
        
        // Check if current model exists in the selected provider
        if (this.editor?.aiEditor?.options?.ai?.models?.[provider]) {
            const config = this.editor.aiEditor.options.ai.models[provider];
            let currentModelId = config.modelId;
            
            if (!currentModelId) {
                if (provider === 'openai' || provider === 'openrouter' || provider === 'gitee') {
                    currentModelId = config.model;
                } else if (provider === 'spark') {
                    currentModelId = config.version;
                } else if (provider === 'wenxin') {
                    currentModelId = config.model;
                }
            }
            
            // If model doesn't exist in predefined list, add it
            if (currentModelId && !this.availableModels.some(m => m.id === currentModelId)) {
                this.availableModels.push({
                    id: currentModelId,
                    name: this.getDisplayNameForModel(currentModelId),
                    provider: provider,
                    description: 'Custom model'
                });
            }
        }
        
        this.menuData = this.availableModels;
    }

    getMenuText(): string {
        if (this.availableModels.length === 0) {
            return "Select Model";
        }
        
        const activeModel = this.availableModels[this.activeIndex];
        if (!activeModel) {
            return "Select Model";
        }
        
        // For a cleaner UI, just return the model name without any provider prefix
        return activeModel.name;
    }

    onDropdownActive(_editor: Editor, _index: number): boolean {
        return this.availableModels.length > 0;
    }

    onDropdownItemClick(index: number): void {
        if (index < 0 || index >= this.availableModels.length) return;
        
        const selectedModel = this.availableModels[index];
        if (!selectedModel || !this.editor?.aiEditor?.options?.ai?.models) return;
        
        // Update the model configuration
        const providerConfig = this.editor.aiEditor.options.ai.models[selectedModel.provider] || {};
        
        // Set the universal modelId field
        providerConfig.modelId = selectedModel.id;
        
        // Also update provider-specific fields for backward compatibility
        if (selectedModel.provider === 'openai' || selectedModel.provider === 'openrouter' || selectedModel.provider === 'gitee') {
            providerConfig.model = selectedModel.id;
        } else if (selectedModel.provider === 'spark') {
            providerConfig.version = selectedModel.id;
        } else if (selectedModel.provider === 'wenxin') {
            providerConfig.model = selectedModel.id;
        }
        
        // Update configuration
        this.editor.aiEditor.options.ai.models[selectedModel.provider] = providerConfig;
        
        // Update the model instance
        const model = AiModelManager.get(selectedModel.provider);
        if (model) {
            // Update universal modelId
            model.aiModelConfig.modelId = selectedModel.id;
            
            // Also update provider-specific fields
            if (selectedModel.provider === 'openai' || selectedModel.provider === 'openrouter' || selectedModel.provider === 'gitee') {
                model.aiModelConfig.model = selectedModel.id;
            } else if (selectedModel.provider === 'spark') {
                model.aiModelConfig.version = selectedModel.id;
            } else if (selectedModel.provider === 'wenxin') {
                model.aiModelConfig.model = selectedModel.id;
            }
        }
        
        // Update active index
        this.activeIndex = index;
        
        // Update UI
        this.updateTemplate();
        
        // Dispatch events for other components
        // First, dispatch model changed event
        const modelChangedEvent = new CustomEvent('aie-model-changed', {
            detail: {
                provider: selectedModel.provider,
                model: selectedModel.id,
                displayName: selectedModel.name
            },
            bubbles: true,
            composed: true
        });
        document.dispatchEvent(modelChangedEvent);
        
        // Then, dispatch configuration changed event with detailed information
        const configChangedEvent = new CustomEvent('aie-model-config-changed', {
            detail: {
                provider: selectedModel.provider,
                modelId: selectedModel.id,
                config: providerConfig,
                source: 'model-selector',
                changeType: 'model-selection'
            },
            bubbles: true,
            composed: true
        });
        document.dispatchEvent(configChangedEvent);
        
        // Force a refresh of the display to ensure UI updates
        this.refreshDisplay();
    }

    onDropdownItemRender(index: number): Element | string {
        const model = this.availableModels[index];
        const isActive = index === this.activeIndex;
        
        return `
        <div style="display: flex; flex-direction: column; padding: 6px 0;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: ${isActive ? 'bold' : 'normal'};">${model.name}</span>
                ${isActive ? '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>' : ''}
            </div>
            ${model.description ? `<span style="font-size: 11px; color: #666;">${model.description}</span>` : ''}
        </div>
        `;
    }
}

// Register the custom element
customElements.define('aie-model-selector', ModelSelector); 