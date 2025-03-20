import { InnerEditor } from "../../core/AiEditor.ts";
import { AbstractMenuButton } from "../AbstractMenuButton.ts";

export class FileUpload extends AbstractMenuButton {

    fileInput?: HTMLInputElement;
    fileButton?: HTMLDivElement;
    supportedFormatsTooltip?: HTMLDivElement;

    constructor() {
        super();
        this.template = `
        <div class="aie-file-button" style="display: flex; align-items: center; padding: 4px 10px; background-color: #f0f5ff; border-radius: 4px; border: 1px solid #e0e9ff; margin-right: 5px; position: relative;">
            <input type="file" style="display: none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" style="margin-right: 5px;"><path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM13 12H16L12 16L8 12H11V8H13V12Z"></path></svg>
            <span style="font-size: 13px; color: #4285f4; font-weight: 500;">File/Doc</span>
            <div class="aie-file-tooltip" style="display: none; position: absolute; top: 100%; left: 0; background: white; border: 1px solid #e0e9ff; border-radius: 4px; padding: 8px 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 1000; width: 200px; margin-top: 8px; font-size: 12px;">
                <div style="font-weight: bold; margin-bottom: 4px;">Supported document types:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                    <span style="background: #f0f5ff; padding: 2px 6px; border-radius: 3px;">PDF</span>
                    <span style="background: #f0f5ff; padding: 2px 6px; border-radius: 3px;">DOCX</span>
                    <span style="background: #f0f5ff; padding: 2px 6px; border-radius: 3px;">TXT</span>
                    <span style="background: #f0f5ff; padding: 2px 6px; border-radius: 3px;">HTML</span>
                    <span style="background: #f0f5ff; padding: 2px 6px; border-radius: 3px;">CSV</span>
                </div>
                <div style="margin-top: 6px; font-style: italic;">Content will be extracted and inserted into the editor</div>
            </div>
        </div>
        `;
        this.registerClickListener();
    }

    connectedCallback() {
        super.connectedCallback();
        if (this.options?.fileUpload?.customMenuInvoke) {
            this.querySelector("input")!.remove();
        } else {
            this.fileInput = this.querySelector("input") as HTMLInputElement;
            this.fileButton = this.querySelector(".aie-file-button") as HTMLDivElement;
            this.supportedFormatsTooltip = this.querySelector(".aie-file-tooltip") as HTMLDivElement;
            
            // Apply theme if needed
            this.updateButtonTheme();
            
            // Set up hover behavior for tooltip
            if (this.fileButton && this.supportedFormatsTooltip) {
                this.fileButton.addEventListener("mouseover", () => {
                    this.supportedFormatsTooltip!.style.display = "block";
                });
                
                this.fileButton.addEventListener("mouseout", () => {
                    this.supportedFormatsTooltip!.style.display = "none";
                });
            }
            
            // Set up file input change handler
            this.fileInput!.addEventListener("change", () => {
                const files = this.fileInput?.files;
                if (files && files.length > 0) {
                    for (let file of files) {
                        this.editor?.commands.uploadFile(file);
                    }
                }
                (this.fileInput as any).value = "";
            });
            
            // Add supported file formats to the accept attribute
            if (this.fileInput && this.options?.fileUpload?.supportedFormats) {
                const mimeTypes = [
                    // Default file types
                    "image/*", "video/*", "audio/*", 
                    // Document types
                    "application/pdf", 
                    "application/msword", 
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "text/plain", 
                    "text/html",
                    "text/csv",
                    "application/vnd.ms-excel",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ];
                this.fileInput.setAttribute("accept", mimeTypes.join(","));
            }
        }
    }

    // Update button theme based on editor theme
    private updateButtonTheme() {
        if (!this.fileButton || !this.supportedFormatsTooltip) return;
        
        const isDarkTheme = document.body.classList.contains('aie-theme-dark') || 
                           this.closest('.aie-container')?.classList.contains('aie-theme-dark');
        
        if (isDarkTheme) {
            this.fileButton.style.backgroundColor = '#2d3748';
            this.fileButton.style.borderColor = '#4a5568';
            this.fileButton.querySelector('span')!.style.color = '#90cdf4';
            
            // Update tooltip for dark theme
            this.supportedFormatsTooltip.style.backgroundColor = '#2d3748';
            this.supportedFormatsTooltip.style.borderColor = '#4a5568';
            this.supportedFormatsTooltip.style.color = '#e2e8f0';
            
            // Update format badges
            const formatBadges = this.supportedFormatsTooltip.querySelectorAll('span');
            formatBadges.forEach(badge => {
                badge.style.backgroundColor = '#4a5568';
            });
        } else {
            this.fileButton.style.backgroundColor = '#f0f5ff';
            this.fileButton.style.borderColor = '#e0e9ff';
            this.fileButton.querySelector('span')!.style.color = '#4285f4';
            
            // Update tooltip for light theme
            this.supportedFormatsTooltip.style.backgroundColor = 'white';
            this.supportedFormatsTooltip.style.borderColor = '#e0e9ff';
            this.supportedFormatsTooltip.style.color = '#333';
            
            // Update format badges
            const formatBadges = this.supportedFormatsTooltip.querySelectorAll('span');
            formatBadges.forEach(badge => {
                badge.style.backgroundColor = '#f0f5ff';
            });
        }
    }

    // @ts-ignore
    onClick(commands) {
        if (this.options?.fileUpload?.customMenuInvoke) {
            this.options.fileUpload.customMenuInvoke((this.editor as InnerEditor).aiEditor);
        } else {
            this.fileInput?.click();
        }
    }
    
    // Listen for theme changes
    onTransaction(event: any): void {
        super.onTransaction?.(event);
        // Check if theme has changed
        if (event && event.transaction && event.transaction.meta && event.transaction.meta.theme) {
            this.updateButtonTheme();
        }
    }
} 