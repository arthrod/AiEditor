import { Editor, EditorEvents } from "@tiptap/core";
import { AiMenu } from "../../ai/AiGlobalConfig.ts";
import { AiModelManager } from "../../ai/AiModelManager.ts";
import { DefaultAiMessageListener } from "../../ai/core/DefaultAiMessageListener.ts";
import { OpenRouterModelConfig } from "../../ai/openrouter/OpenRouterModelConfig.ts";
import { AiEditorOptions } from "../../core/AiEditor.ts";
import { AbstractDropdownMenuButton } from "../AbstractDropdownMenuButton.ts";

export const defaultAiMenus: AiMenu[] = [
    {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"></path><path d="M4 18.9997H20V13.9997H22V19.9997C22 20.552 21.5523 20.9997 21 20.9997H3C2.44772 20.9997 2 20.552 2 19.9997V13.9997H4V18.9997ZM16.1716 6.9997L12.2218 3.04996L13.636 1.63574L20 7.9997L13.636 14.3637L12.2218 12.9495L16.1716 8.9997H5V6.9997H16.1716Z"></path></svg>`,
        name: `ai-continuation`,
        prompt: "{content}\n\n请帮我继续扩展以上这段文字的内容。\n注意：你应该先判断一下这句话是中文还是英文，如果是中文，请给我返回中文的内容，如果是英文，请给我返回英文内容，只需要返回内容即可，不需要告知我是中文还是英文。",
        text: "focusBefore",
        model: "auto",
    },
    {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"></path><path d="M15 5.25C16.7949 5.25 18.25 3.79493 18.25 2H19.75C19.75 3.79493 21.2051 5.25 23 5.25V6.75C21.2051 6.75 19.75 8.20507 19.75 10H18.25C18.25 8.20507 16.7949 6.75 15 6.75V5.25ZM4 7C4 5.89543 4.89543 5 6 5H13V3H6C3.79086 3 2 4.79086 2 7V17C2 19.2091 3.79086 21 6 21H18C20.2091 21 22 19.2091 22 17V12H20V17C20 18.1046 19.1046 19 18 19H6C4.89543 19 4 18.1046 4 17V7Z"></path></svg>`,
        name: `ai-optimization`,
        prompt: "{content}\n\n请帮我优化以上这段文字的内容，并返回结果\n注意：你应该先判断一下这句话是中文还是英文，如果是中文，请给我返回中文的内容，如果是英文，请给我返回英文内容，只需要返回内容即可，不需要告知我是中文还是英文。",
        text: "selected",
        model: "auto",
    },
    {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"></path><path d="M17.934 3.0359L19.666 4.0359L18.531 6H21V8H19V12H21V14H19V21H17V14L13.9157 14.0004C13.5914 16.8623 12.3522 19.3936 10.5466 21.1933L8.98361 19.9233C10.5031 18.4847 11.5801 16.4008 11.9008 14.0009L10 14V12L12 11.999V8H10V6H12.467L11.334 4.0359L13.066 3.0359L14.777 6H16.221L17.934 3.0359ZM5 13.803L3 14.339V12.268L5 11.732V8H3V6H5V3H7V6H9V8H7V11.197L9 10.661V12.731L7 13.267V18.5C7 19.8807 5.88071 21 4.5 21H3V19H4.5C4.74546 19 4.94961 18.8231 4.99194 18.5899L5 18.5V13.803ZM17 8H14V12H17V8Z"></path></svg>`,
        name: `ai-proofreading`,
        prompt: "{content}\n\n请帮我找出以上这段文字的错别字，把错别字修改后，并返回结果，不要解释或其他多余的内容\n注意：你应该先判断一下这句话是中文还是英文，如果是中文，请给我返回中文的内容，如果是英文，请给我返回英文内容，只需要返回内容即可，不需要告知我是中文还是英文。",
        text: "selected",
        model: "auto",
    },
    {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"></path><path d="M5 15V17C5 18.0544 5.81588 18.9182 6.85074 18.9945L7 19H10V21H7C4.79086 21 3 19.2091 3 17V15H5ZM18 10L22.4 21H20.245L19.044 18H14.954L13.755 21H11.601L16 10H18ZM17 12.8852L15.753 16H18.245L17 12.8852ZM8 2V4H12V11H8V14H6V11H2V4H6V2H8ZM17 3C19.2091 3 21 4.79086 21 7V9H19V7C19 5.89543 18.1046 5 17 5H14V3H17ZM6 6H4V9H6V6ZM10 6H8V9H10V6Z"></path></svg>`,
        name: `ai-translation`,
        prompt: "请帮我翻译以上内容，在翻译之前，想先判断一下这个内容是不是中文，如果是中文，则翻译为英文，如果是其他语言，则需要翻译为中文，注意，你只需要返回翻译的结果，不需要对此进行任何解释，不需要除了翻译结果以外的其他任何内容。",
        text: "selected",
        model: "auto",
    }
]

interface AiMenuItem {
    icon: string;
    name: string;
    prompt?: string;
    text?: "selected" | "focusBefore";
    model?: string;
    onClick?: (event: MouseEvent, editor: Editor) => void;
    children?: AiMenuItem[];
}

export class Ai extends AbstractDropdownMenuButton<AiMenuItem> {
    constructor() {
        super();
        this.width = "auto";
        this.menuTextWidth = "auto";
        
        // Listen for model changes to update display
        document.addEventListener('aie-model-changed', (event: CustomEvent) => {
            if (!event.detail) return;
            this.updateDisplayModel();
        });
        
        // Listen for provider changes to update display
        document.addEventListener('aie-provider-changed', (event: CustomEvent) => {
            if (!event.detail) return;
            this.updateDisplayModel();
        });
    }

    private currentModelDisplay: string = "";
    
    private updateDisplayModel() {
        // Get the current provider setting
        const provider = this.editor?.aiEditor?.options?.ai?.bubblePanelModel || 'auto';
        
        // Just show "AI" for a cleaner UI
        this.currentModelDisplay = "AI";
        
        // Make sure to update the template
        this.updateTemplate();
    }

    onCreate(_: EditorEvents["create"], options: AiEditorOptions): void {
        super.onCreate(_, options);
        
        // Initialize menus
        this.menuData = options.ai?.menus || [];
        
        // Initialize model display
        this.updateDisplayModel();
    }

    renderTemplate(): string {
        const aiIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12.395 4.91992L17.875 8.66602C18.505 9.07302 18.875 9.80602 18.875 10.58V17.418C18.875 18.193 18.505 18.928 17.875 19.335L12.395 23.081C11.755 23.497 10.935 23.497 10.295 23.081L4.81498 19.335C4.18498 18.928 3.81498 18.193 3.81498 17.418V10.58C3.81498 9.80602 4.18498 9.07202 4.81498 8.66602L10.295 4.91992C10.935 4.50392 11.755 4.50392 12.395 4.91992Z" fill="none" stroke="currentColor" stroke-width="1"></path>
            <path d="M12 8.10938V19.5" stroke="currentColor" stroke-width="1.125" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M16.5 15.7952L7.5 12.2952" stroke="currentColor" stroke-width="1.125" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M16.5 10.7048L7.5 14.2048" stroke="currentColor" stroke-width="1.125" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>`;

        this.template = `
        <div>
            <div style="display: flex; align-items: center;" id="tippy" tabindex="0" role="button" aria-haspopup="true" aria-expanded="false">
                <span style="display:flex;text-align:center;overflow: hidden;" id="text">
                    <div style="display: flex; align-items: center;">
                        <div style="height: 16px;">${aiIcon}</div>
                        <span style="margin-left: 4px; font-size: 13px; font-weight: 500;">AI</span>
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
     * Update the display to reflect the current model
     */
    updateTemplate() {
        if (!this.textEl) return;
        
        const nameElement = this.textEl.querySelector('span');
        if (nameElement) {
            nameElement.textContent = this.currentModelDisplay;
        }
    }

    createMenuElement() {
        const div = document.createElement("div");
        div.style.height = this.dropDivHeight;
        div.style.width = this.dropDivWith;
        div.classList.add("aie-dropdown-container");

        // Add current model header
        const currentModelProvider = this.editor?.aiEditor?.options?.ai?.bubblePanelModel || "auto";
        let modelDisplay = "";
        
        if (currentModelProvider === "openrouter") {
            const openrouterConfig = this.editor?.aiEditor?.options?.ai?.models?.openrouter as OpenRouterModelConfig | undefined;
            if (openrouterConfig && 'model' in openrouterConfig) {
                const modelParts = openrouterConfig.model.split('/');
                modelDisplay = `${modelParts[0].toUpperCase()}: ${modelParts[modelParts.length - 1].toUpperCase()}`;
            } else {
                modelDisplay = "OpenRouter";
            }
        } else if (currentModelProvider) {
            modelDisplay = currentModelProvider.charAt(0).toUpperCase() + currentModelProvider.slice(1);
        }
        
        const modelHeader = document.createElement("div");
        modelHeader.style.padding = "5px 10px";
        modelHeader.style.borderBottom = "1px solid #eee";
        modelHeader.style.fontWeight = "bold";
        modelHeader.style.fontSize = "12px";
        modelHeader.style.color = "#666";
        modelHeader.innerHTML = `Current AI: ${modelDisplay}`;
        div.appendChild(modelHeader);

        for (let i = 0; i < this.menuData.length; i++) {
            const item = document.createElement("div");
            item.classList.add("aie-dropdown-item");
            item.innerHTML = `
            <div class="text" style="display: flex;padding: 5px 10px">${this.onDropdownItemRender(i)}</div>
            `
            item.addEventListener("click", (evt) => {
                const menuItem = this.menuData[i];
                if (menuItem.onClick) {
                    menuItem.onClick(evt, this.editor!.aiEditor)
                    this.tippyInstance!.hide()
                } else {
                    this.onDropdownItemClick(i);
                    this.tippyInstance!.hide()
                }
            });
            div.appendChild(item)
        }
        this.tippyEl = div;
        return div;
    }

    onTransaction(_: EditorEvents["transaction"]) {
    }

    onDropdownActive(_editor: Editor, _index: number): boolean {
        return true;
    }

    getSelectedText(text: "selected" | "focusBefore") {
        if (text === "selected") {
            const {from, to} = this.editor!.state.selection;
            return this.editor!.state.doc.textBetween(from, to, " ");
        } else {
            const {from} = this.editor!.state.selection;
            return this.editor!.state.doc.textBetween(0, from, " ");
        }
    }

    onDropdownItemClick(index: number): void {
        const aiMenu = this.menuData[index];
        if (!aiMenu || typeof aiMenu === 'string') return;
        
        const templateContent = aiMenu.text === "focusBefore" ?
            this.getSelectedText("focusBefore") : this.getSelectedText("selected");

        const modelName = aiMenu.model === "auto"
            ? (this.editor?.aiEditor.options.ai?.bubblePanelModel || "openrouter")
            : aiMenu.model;

        if (!templateContent || !aiMenu.prompt) {
            return;
        }

        const prompt = aiMenu.prompt.replace(/{content}/g, templateContent);
        if (this.editor) {
            const aiListener = new DefaultAiMessageListener(this.editor);
            const model = AiModelManager.get(modelName || "openrouter");
            model?.chat(templateContent, prompt, aiListener);
        }
    }

    onDropdownItemRender(index: number): Element | string {
        const item = this.menuData[index];
        if (typeof item === "string") {
            return `<hr/>`;
        } else {
            return `<div style="display:flex;align-items: center;">
                <div style="margin-right:5px;">${item.icon}</div>
                <span>${item.name}</span>
            </div>`;
        }
    }

    onMenuTextRender(): Element | string {
        const aiIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12.395 4.91992L17.875 8.66602C18.505 9.07302 18.875 9.80602 18.875 10.58V17.418C18.875 18.193 18.505 18.928 17.875 19.335L12.395 23.081C11.755 23.497 10.935 23.497 10.295 23.081L4.81498 19.335C4.18498 18.928 3.81498 18.193 3.81498 17.418V10.58C3.81498 9.80602 4.18498 9.07202 4.81498 8.66602L10.295 4.91992C10.935 4.50392 11.755 4.50392 12.395 4.91992Z" fill="none" stroke="currentColor" stroke-width="1"></path>
            <path d="M12 8.10938V19.5" stroke="currentColor" stroke-width="1.125" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M16.5 15.7952L7.5 12.2952" stroke="currentColor" stroke-width="1.125" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M16.5 10.7048L7.5 14.2048" stroke="currentColor" stroke-width="1.125" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>`;
        
        return `
        <div style="display: flex; align-items: center;">
            <div style="height: 16px;">${aiIcon}</div>
            <span style="margin-left: 4px; font-size: 13px; font-weight: 500;">AI</span>
        </div>
        `;
    }
}

