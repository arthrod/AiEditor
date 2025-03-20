import { Editor, EditorEvents } from "@tiptap/core";
import { AiEditorOptions } from "../../core/AiEditor";
import { AbstractDropdownMenuButton } from "../AbstractDropdownMenuButton";

/**
 * Interface representing an AI provider
 */
export interface AIProvider {
    id: string;
    name: string;
    description?: string;
}

/**
 * AiProviderSelector component for the toolbar
 * This component allows users to select which AI provider to use
 */
export class AiProviderSelector extends AbstractDropdownMenuButton<AIProvider> {
    // List of available AI providers
    private availableProviders: AIProvider[] = [
        { id: "openrouter", name: "OpenRouter", description: "Advanced models from various providers" },
        { id: "spark", name: "Spark", description: "IFLYTEK Spark models" },
        { id: "openai", name: "OpenAI", description: "OpenAI models" },
        { id: "auto", name: "Auto", description: "Automatically choose the best available model" }
    ];

    constructor() {
        super();
        this.dropDivHeight = "auto";
        this.dropDivWith = "200px";
        this.width = "auto";
        this.menuTextWidth = "auto";
        this.setAttribute('data-component', 'ai-provider-selector');
        
        // Listen for model changes to update display
        document.addEventListener('aie-model-changed', (event: CustomEvent) => {
            if (!event.detail) return;
            this.updateTemplate();
            this.forceUIUpdate();
        });
        
        // Listen for model configuration changes
        document.addEventListener('aie-model-config-changed', (event: CustomEvent) => {
            if (!event.detail) return;
            this.updateTemplate();
            this.forceUIUpdate();
        });
    }

    onCreate(_: EditorEvents["create"], options: AiEditorOptions) {
        super.onCreate(_, options);
        
        // Initialize available providers
        this.initializeProviders(options);
        
        // Set selected provider
        this.menuData = this.availableProviders;
    }

    /**
     * Initialize available providers based on the editor options
     */
    private initializeProviders(options: AiEditorOptions) {
        // Get available models
        if (!options.ai?.models) {
            // If no models configured, only keep auto option
            this.availableProviders = this.availableProviders.filter(p => p.id === "auto");
            return;
        }
        
        // Get configured model keys
        const configuredModelKeys = Object.keys(options.ai.models || {});
        
        // Filter providers based on configured models
        this.availableProviders = this.availableProviders.filter(provider => {
            // Always keep "auto" option
            if (provider.id === "auto") return true;
            
            // Check if this provider is configured
            return configuredModelKeys.includes(provider.id);
        });
    }

    renderTemplate() {
        // Get current model name for display
        const currentModelProvider = this.editor?.aiEditor?.options?.ai?.bubblePanelModel || "auto";
        let displayName = this.availableProviders.find(p => p.id === currentModelProvider)?.name || "AI";
        
        // Only show the provider name without the model details for a cleaner interface
        const aiIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12.395 4.91992L17.875 8.66602C18.505 9.07302 18.875 9.80602 18.875 10.58V17.418C18.875 18.193 18.505 18.928 17.875 19.335L12.395 23.081C11.755 23.497 10.935 23.497 10.295 23.081L4.81498 19.335C4.18498 18.928 3.81498 18.193 3.81498 17.418V10.58C3.81498 9.80602 4.18498 9.07202 4.81498 8.66602L10.295 4.91992C10.935 4.50392 11.755 4.50392 12.395 4.91992Z" fill="none" stroke="currentColor" stroke-width="1"></path>
            <path d="M12 8.10938V19.5" stroke="currentColor" stroke-width="1.125" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M16.5 15.7952L7.5 12.2952" stroke="currentColor" stroke-width="1.125" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M16.5 10.7048L7.5 14.2048" stroke="currentColor" stroke-width="1.125" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>`;
        
        this.template = `
        <div>
            <div style="display: flex; align-items: center; gap: 6px; padding: 0 8px;" id="tippy">
                <span style="display:flex;text-align:center;overflow: hidden;" id="text">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="height: 16px;">${aiIcon}</div>
                        <span style="font-size: 13px;">Provider: ${displayName}</span>
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
     * Force a UI update to ensure changes are visible
     */
    private forceUIUpdate(): void {
        if (!this.textEl) return;
        
        // Get the display element
        const displayElement = this.textEl.querySelector('div');
        if (!displayElement) return;
        
        // Force a redraw by toggling display style
        displayElement.style.display = 'none';
        // Trigger DOM reflow
        void displayElement.offsetHeight;
        // Restore display
        displayElement.style.display = '';
    }

    /**
     * Update the template manually to reflect changes
     */
    updateTemplate() {
        if (!this.textEl) {
            this.template = this.renderTemplate();
            return;
        }
        
        const displayElement = this.textEl.querySelector('div');
        if (!displayElement) {
            this.template = this.renderTemplate();
            return;
        }
        
        // Get current model name for display
        const currentModelProvider = this.editor?.aiEditor?.options?.ai?.bubblePanelModel || "auto";
        const displayName = this.availableProviders.find(p => p.id === currentModelProvider)?.name || "AI";
        
        // Update the display name in the UI - show provider name
        const nameElement = displayElement.querySelector('span');
        if (nameElement) {
            nameElement.textContent = `Provider: ${displayName}`;
        }
        
        // Force a redraw of the element to ensure UI updates
        this.forceUIUpdate();
    }

    onTransaction(_: EditorEvents["transaction"]) {
        // No need to do anything on transaction
    }

    onDropdownActive(_editor: Editor, _index: number): boolean {
        return true;
    }

    onDropdownItemClick(index: number): void {
        const provider = this.menuData[index];
        
        // Update the bubblePanelModel in editor options
        if (this.editor?.aiEditor.options.ai) {
            this.editor.aiEditor.options.ai.bubblePanelModel = provider.id;
            
            // Rerender the template to update display
            this.updateTemplate();
            
            // Dispatch event for other components like ModelSelector
            const event = new CustomEvent('aie-provider-changed', {
                detail: {
                    provider: provider.id
                }
            });
            document.dispatchEvent(event);
        }
    }

    onDropdownItemRender(index: number): Element | string {
        const provider = this.menuData[index];
        const currentModelProvider = this.editor?.aiEditor?.options?.ai?.bubblePanelModel || "auto";
        const isActive = provider.id === currentModelProvider;
        
        return `
        <div style="display: flex; flex-direction: column; padding: 6px 0;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: ${isActive ? 'bold' : 'normal'};">${provider.name}</span>
                ${isActive ? '<svg width="16" height="16" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>' : ''}
            </div>
            ${provider.description ? `<span style="font-size: 11px; color: #666;">${provider.description}</span>` : ''}
        </div>
        `;
    }

    onMenuTextRender(_index: number): Element | string {
        // Not needed as we override renderTemplate
        return "";
    }
} 