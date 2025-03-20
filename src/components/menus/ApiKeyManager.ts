import { Editor, EditorEvents } from "@tiptap/core";
import { AiModelManager } from "../../ai/AiModelManager";
import { AiEditorOptions } from "../../core/AiEditor";
import { AbstractMenuButton } from "../AbstractMenuButton";

/**
 * ApiKeyManager component for the toolbar
 * This component allows users to manage their API keys for different AI providers
 */
export class ApiKeyManager extends AbstractMenuButton {
    private dialog: HTMLDivElement | null = null;
    private mask: HTMLDivElement | null = null;

    constructor() {
        super();
    }

    getClassName(): string {
        return "aie-api-key-manager";
    }

    getIcon(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
        </svg>`;
    }

    getTip(): string {
        return "Manage API Keys";
    }

    onClick(_event: MouseEvent, _editor: Editor): void {
        this.createDialog();
    }

    // Create the dialog UI
    private createDialog(): void {
        if (this.dialog) {
            // Dialog already exists, show it
            this.showDialog();
            return;
        }

        // Create mask
        this.mask = document.createElement('div');
        this.mask.className = 'aie-dialog-mask';
        this.mask.addEventListener('click', () => this.hideDialog());

        // Create dialog
        this.dialog = document.createElement('div');
        this.dialog.className = 'aie-api-key-dialog';
        this.dialog.innerHTML = `
            <div class="aie-dialog-header">
                <h3>Manage API Keys</h3>
                <button class="aie-dialog-close">&times;</button>
            </div>
            <div class="aie-dialog-content">
                <div class="aie-api-key-form"></div>
            </div>
            <div class="aie-dialog-footer">
                <button class="aie-dialog-save">Save</button>
                <button class="aie-dialog-cancel">Cancel</button>
            </div>
        `;

        // Add CSS
        const style = document.createElement('style');
        style.textContent = `
            .aie-dialog-mask {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 1000;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .aie-api-key-dialog {
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                width: 480px;
                max-width: 90vw;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                z-index: 1001;
            }
            .aie-dialog-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                border-bottom: 1px solid #eee;
            }
            .aie-dialog-header h3 {
                margin: 0;
                font-size: 18px;
            }
            .aie-dialog-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                margin: 0;
                line-height: 1;
            }
            .aie-dialog-content {
                padding: 16px;
                overflow-y: auto;
                flex: 1;
            }
            .aie-dialog-footer {
                padding: 16px;
                border-top: 1px solid #eee;
                display: flex;
                justify-content: flex-end;
                gap: 8px;
            }
            .aie-dialog-save, .aie-dialog-cancel {
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
            }
            .aie-dialog-save {
                background-color: #1677ff;
                color: white;
            }
            .aie-dialog-cancel {
                background-color: #f5f5f5;
                color: #333;
            }
            .aie-api-key-form {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            .aie-api-key-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .aie-api-key-group-title {
                font-weight: 600;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .aie-api-key-input {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .aie-api-key-input label {
                font-size: 12px;
                color: #666;
            }
            .aie-api-key-input input {
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            .aie-api-key-input input:focus {
                outline: none;
                border-color: #1677ff;
            }
            .aie-api-key-description {
                font-size: 12px;
                color: #888;
                margin-top: 4px;
            }
        `;
        document.head.appendChild(style);

        // Attach event listeners
        this.dialog.querySelector('.aie-dialog-close')?.addEventListener('click', () => this.hideDialog());
        this.dialog.querySelector('.aie-dialog-cancel')?.addEventListener('click', () => this.hideDialog());
        this.dialog.querySelector('.aie-dialog-save')?.addEventListener('click', () => this.saveApiKeys());

        // Add to DOM
        document.body.appendChild(this.mask);
        document.body.appendChild(this.dialog);
        
        // Build form fields
        this.buildApiKeyForm();
        
        // Show dialog
        this.showDialog();
    }

    private buildApiKeyForm(): void {
        const formContainer = this.dialog?.querySelector('.aie-api-key-form');
        if (!formContainer || !this.editor) return;
        
        // Get available models
        const availableModels = AiModelManager.getAll();
        
        // Create form fields for each model type
        availableModels.forEach(({ name, model }) => {
            const modelConfig = model.aiModelConfig;
            const modelType = name;
            
            // Create model group container
            const modelGroup = document.createElement('div');
            modelGroup.className = 'aie-api-key-group';
            modelGroup.dataset.model = modelType;
            
            // Model title
            const modelTitle = document.createElement('div');
            modelTitle.className = 'aie-api-key-group-title';
            modelTitle.textContent = this.getProviderDisplayName(modelType);
            modelGroup.appendChild(modelTitle);
            
            // Create appropriate input fields based on model type
            switch (modelType) {
                case 'openai':
                    this.createInputField(modelGroup, 'apiKey', 'API Key', 'Enter your OpenAI API key', modelConfig.apiKey || '');
                    this.createInputField(modelGroup, 'endpoint', 'Endpoint', 'API endpoint (default: https://api.openai.com)', modelConfig.endpoint || '');
                    this.createInputField(modelGroup, 'model', 'Model', 'Model name (e.g. gpt-4o-mini)', modelConfig.model || '');
                    break;
                case 'openrouter':
                    this.createInputField(modelGroup, 'apiKey', 'API Key', 'Enter your OpenRouter API key', modelConfig.apiKey || '');
                    this.createInputField(modelGroup, 'model', 'Model', 'Model identifier', modelConfig.model || '');
                    break;
                case 'spark':
                    this.createInputField(modelGroup, 'appId', 'App ID', 'Enter your IFLYTEK App ID', modelConfig.appId || '');
                    this.createInputField(modelGroup, 'apiKey', 'API Key', 'Enter your IFLYTEK API key', modelConfig.apiKey || '');
                    this.createInputField(modelGroup, 'apiSecret', 'API Secret', 'Enter your IFLYTEK API secret', modelConfig.apiSecret || '');
                    break;
                case 'wenxin':
                    this.createInputField(modelGroup, 'apiKey', 'API Key', 'Enter your Baidu API key', modelConfig.apiKey || '');
                    this.createInputField(modelGroup, 'secretKey', 'Secret Key', 'Enter your Baidu secret key', modelConfig.secretKey || '');
                    break;
                case 'gitee':
                    this.createInputField(modelGroup, 'apiKey', 'API Key', 'Enter your Gitee API key', modelConfig.apiKey || '');
                    break;
                case 'custom':
                    this.createInputField(modelGroup, 'url', 'API URL', 'Enter the API URL', typeof modelConfig.url === 'string' ? modelConfig.url : '');
                    // Add more fields as needed for custom model
                    break;
            }
            
            formContainer.appendChild(modelGroup);
        });
    }

    private createInputField(container: HTMLElement, name: string, label: string, placeholder: string, value: string): void {
        const inputContainer = document.createElement('div');
        inputContainer.className = 'aie-api-key-input';
        
        const labelElement = document.createElement('label');
        labelElement.textContent = label;
        inputContainer.appendChild(labelElement);
        
        const input = document.createElement('input');
        input.type = name.includes('key') || name.includes('secret') ? 'password' : 'text';
        input.name = name;
        input.placeholder = placeholder;
        input.value = value;
        inputContainer.appendChild(input);
        
        container.appendChild(inputContainer);
    }

    private getProviderDisplayName(providerKey: string): string {
        const providers: Record<string, string> = {
            'openai': 'OpenAI',
            'openrouter': 'OpenRouter',
            'spark': 'IFLYTEK Spark',
            'wenxin': 'Baidu WenXin',
            'gitee': 'Gitee',
            'custom': 'Custom API'
        };
        
        return providers[providerKey] || providerKey.charAt(0).toUpperCase() + providerKey.slice(1);
    }

    private saveApiKeys(): void {
        if (!this.dialog || !this.editor) return;
        
        // Get all model groups
        const modelGroups = this.dialog.querySelectorAll('.aie-api-key-group');
        
        modelGroups.forEach(group => {
            const modelType = group.getAttribute('data-model');
            if (!modelType) return;
            
            // Get all input fields for this model
            const inputs = group.querySelectorAll('input');
            const configData: Record<string, string> = {};
            
            inputs.forEach(input => {
                const name = input.name;
                const value = input.value.trim();
                
                if (value) {
                    configData[name] = value;
                }
            });
            
            // Update model configuration if there are any values
            if (Object.keys(configData).length > 0) {
                this.updateModelConfig(modelType, configData);
            }
        });
        
        // Hide dialog after saving
        this.hideDialog();
    }
    
    private updateModelConfig(modelType: string, configData: Record<string, string>): void {
        if (!this.editor?.aiEditor?.options?.ai?.models) return;
        
        // Get current model config
        const currentConfig = this.editor.aiEditor.options.ai.models[modelType] || {};
        
        // Update config with new values
        const updatedConfig = {
            ...currentConfig,
            ...configData
        };
        
        // Update the config in the editor options
        this.editor.aiEditor.options.ai.models[modelType] = updatedConfig;
        
        // Update the actual model instance if it exists
        const model = AiModelManager.get(modelType);
        if (model) {
            // Update the model config
            Object.assign(model.aiModelConfig, configData);
        }
    }

    private showDialog(): void {
        if (this.dialog && this.mask) {
            this.mask.style.display = 'flex';
            this.dialog.style.display = 'flex';
        }
    }

    private hideDialog(): void {
        if (this.dialog && this.mask) {
            this.mask.style.display = 'none';
            this.dialog.style.display = 'none';
        }
    }

    onCreate(_: EditorEvents["create"], _options: AiEditorOptions): void {
        // Nothing to do on create
    }
}

// Register the custom element
customElements.define('aie-api-key-manager', ApiKeyManager); 