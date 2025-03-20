import { EditorEvents } from "@tiptap/core";
import { t } from "i18next";
import tippy, { Instance } from "tippy.js";
import { SmartPaperFillService } from "../../ai/paper/SmartPaperFillService";
import { AiEditorOptions } from "../../core/AiEditor";
import { AbstractMenuButton } from "../AbstractMenuButton";

/**
 * Smart Paper Fill menu component for the toolbar
 */
export class SmartPaperFill extends AbstractMenuButton {
    service?: SmartPaperFillService;
    popup?: Instance;
    progressElement?: HTMLElement;
    messageElement?: HTMLElement;
    progressBar?: HTMLElement;
    actionButton?: HTMLElement;
    analyzeButton?: HTMLElement;
    contextTextarea?: HTMLTextAreaElement;
    selectionStatusElement?: HTMLElement;

    constructor() {
        super();
        this.template = `
        <div style="padding: 0 8px; display: flex; align-items: center;">
            <div style="height: 16px">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M20 2C20.5523 2 21 2.44772 21 3V21C21 21.5523 20.5523 22 20 22H4C3.44772 22 3 21.5523 3 21V3C3 2.44772 3.44772 2 4 2H20ZM19 4H5V20H19V4ZM11 11V17H13V11H11ZM11 7V9H13V7H11Z" fill="currentColor"/>
                </svg>
            </div>
        </div>
        `;
        
        // Register the click listener immediately in constructor
        this.registerClickListener();
    }

    connectedCallback() {
        // This ensures DOM content is set when the element connects to DOM
        super.connectedCallback();
        // Make sure we register our basic listeners here as well
        this.registerClickListener();
    }

    onCreate(event: EditorEvents["create"], options: AiEditorOptions) {
        super.onCreate(event, options);
        
        this.service = new SmartPaperFillService(event.editor);
        
        // Create the popup content
        const popupContent = this.createPopupContent();
        
        // Initialize tippy popup
        this.popup = tippy(this, {
            content: popupContent,
            trigger: 'click',
            interactive: true,
            placement: 'bottom',
            theme: 'light',
            arrow: true,
            maxWidth: 400,
            appendTo: document.body,
            onShow: () => {
                // Check for selection when popup is shown
                this.updateSelectionStatus();
            }
        });
        
        // Set tooltip
        const tip = t('Smart Paper Fill');
        tippy(this, {
            content: tip,
            theme: 'aietip',
            placement: 'top',
            arrow: true,
            appendTo: document.body
        });
        
        // Add keyboard accessibility to the button element
        this.setAttribute('tabindex', '0');
        this.setAttribute('role', 'button');
        this.setAttribute('aria-label', tip);
        
        // Handle keyboard events for accessibility
        this.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.popup?.show();
            }
        });
        
        // Listen for editor selection changes
        event.editor.on('selectionUpdate', () => {
            if (this.popup?.state.isVisible) {
                this.updateSelectionStatus();
            }
        });
    }

    /**
     * Update the UI to reflect current selection status
     */
    private updateSelectionStatus() {
        if (!this.service || !this.selectionStatusElement) return;
        
        // This will update the hasSelection property in the service
        this.service.getContentToProcess();
        
        if (this.service.isWorkingWithSelection()) {
            this.selectionStatusElement.textContent = 'Working with selected text - will only fill empty fields';
            this.selectionStatusElement.style.color = '#4285f4';
            
            if (this.actionButton) {
                this.actionButton.textContent = 'Fill Empty Fields in Selection';
            }
            
            if (this.analyzeButton) {
                this.analyzeButton.textContent = 'Identify Empty Fields';
            }
        } else {
            this.selectionStatusElement.textContent = 'Working with entire document - will only fill empty fields';
            this.selectionStatusElement.style.color = '#666';
            
            if (this.actionButton) {
                this.actionButton.textContent = 'Fill Empty Fields';
            }
            
            if (this.analyzeButton) {
                this.analyzeButton.textContent = 'Identify Empty Fields';
            }
        }
    }

    /**
     * Create the popup content for the Smart Paper Fill menu
     */
    private createPopupContent(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'aie-smart-paper-fill-popup';
        container.style.padding = '15px';
        container.style.minWidth = '300px';
        
        // Add title
        const title = document.createElement('h3');
        title.textContent = 'Smart Paper Fill';
        title.style.margin = '0 0 10px 0';
        title.style.fontSize = '16px';
        container.appendChild(title);
        
        // Add description
        const description = document.createElement('p');
        description.textContent = 'Use AI to automatically fill out empty form fields and papers without overwriting existing text.';
        description.style.margin = '0 0 15px 0';
        description.style.fontSize = '14px';
        description.style.color = '#666';
        container.appendChild(description);
        
        // Add a note about preserving existing text
        const preserveNote = document.createElement('div');
        preserveNote.innerHTML = '<strong>Note:</strong> Smart Paper Fill only fills empty fields and never overwrites existing text.';
        preserveNote.style.fontSize = '13px';
        preserveNote.style.margin = '15px 0';
        preserveNote.style.padding = '8px';
        preserveNote.style.backgroundColor = '#f8f9fa';
        preserveNote.style.borderRadius = '4px';
        preserveNote.style.borderLeft = '3px solid #4CAF50';
        container.appendChild(preserveNote);
        
        // Add selection status indicator
        this.selectionStatusElement = document.createElement('div');
        this.selectionStatusElement.textContent = 'Working with entire document';
        this.selectionStatusElement.style.fontSize = '14px';
        this.selectionStatusElement.style.fontWeight = 'bold';
        this.selectionStatusElement.style.marginBottom = '15px';
        this.selectionStatusElement.style.color = '#666';
        this.selectionStatusElement.style.padding = '8px';
        this.selectionStatusElement.style.backgroundColor = '#f5f5f5';
        this.selectionStatusElement.style.borderRadius = '4px';
        this.selectionStatusElement.style.textAlign = 'center';
        container.appendChild(this.selectionStatusElement);
        
        // Add context input section
        const contextSection = document.createElement('div');
        contextSection.style.marginBottom = '15px';
        
        const contextLabel = document.createElement('label');
        contextLabel.textContent = 'Context (optional):';
        contextLabel.style.display = 'block';
        contextLabel.style.marginBottom = '5px';
        contextLabel.style.fontSize = '14px';
        contextSection.appendChild(contextLabel);
        
        this.contextTextarea = document.createElement('textarea');
        this.contextTextarea.placeholder = 'Provide additional context to help AI understand this document better...';
        this.contextTextarea.style.width = '100%';
        this.contextTextarea.style.minHeight = '80px';
        this.contextTextarea.style.padding = '8px';
        this.contextTextarea.style.borderRadius = '4px';
        this.contextTextarea.style.border = '1px solid #ddd';
        this.contextTextarea.style.fontSize = '13px';
        this.contextTextarea.style.boxSizing = 'border-box';
        this.contextTextarea.addEventListener('input', () => {
            if (this.service) {
                this.service.setUserContext(this.contextTextarea?.value || '');
            }
        });
        contextSection.appendChild(this.contextTextarea);
        
        // Add context hint
        const contextHint = document.createElement('div');
        contextHint.innerHTML = 'Example: "This is a medical form for a 45-year-old patient with diabetes." <br><small>Providing context helps AI understand which empty fields need filling.</small>';
        contextHint.style.fontSize = '12px';
        contextHint.style.color = '#888';
        contextHint.style.marginTop = '5px';
        contextSection.appendChild(contextHint);
        
        container.appendChild(contextSection);
        
        // Add progress section
        const progressSection = document.createElement('div');
        progressSection.style.display = 'none';
        progressSection.style.marginBottom = '15px';
        
        this.progressBar = document.createElement('div');
        this.progressBar.style.height = '6px';
        this.progressBar.style.width = '0%';
        this.progressBar.style.backgroundColor = '#4CAF50';
        this.progressBar.style.borderRadius = '3px';
        this.progressBar.style.transition = 'width 0.3s ease';
        
        const progressTrack = document.createElement('div');
        progressTrack.style.height = '6px';
        progressTrack.style.backgroundColor = '#f0f0f0';
        progressTrack.style.borderRadius = '3px';
        progressTrack.style.marginBottom = '8px';
        progressTrack.appendChild(this.progressBar);
        
        this.messageElement = document.createElement('div');
        this.messageElement.style.fontSize = '12px';
        this.messageElement.style.color = '#666';
        
        progressSection.appendChild(progressTrack);
        progressSection.appendChild(this.messageElement);
        container.appendChild(progressSection);
        
        this.progressElement = progressSection;
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        
        // Add analyze fields button
        this.analyzeButton = document.createElement('button');
        this.analyzeButton.textContent = 'Analyze Fields';
        this.analyzeButton.className = 'aie-button aie-button-secondary';
        this.analyzeButton.style.flex = '1';
        this.analyzeButton.style.padding = '8px 0';
        this.analyzeButton.style.border = '1px solid #ddd';
        this.analyzeButton.style.borderRadius = '4px';
        this.analyzeButton.style.backgroundColor = '#f5f5f5';
        this.analyzeButton.style.cursor = 'pointer';
        this.analyzeButton.addEventListener('click', () => this.onAnalyzeClick());
        buttonContainer.appendChild(this.analyzeButton);
        
        // Add fill document button
        this.actionButton = document.createElement('button');
        this.actionButton.textContent = 'Fill Document';
        this.actionButton.className = 'aie-button aie-button-primary';
        this.actionButton.style.flex = '1';
        this.actionButton.style.padding = '8px 0';
        this.actionButton.style.border = 'none';
        this.actionButton.style.borderRadius = '4px';
        this.actionButton.style.backgroundColor = '#4285f4';
        this.actionButton.style.color = 'white';
        this.actionButton.style.cursor = 'pointer';
        this.actionButton.addEventListener('click', () => this.onFillClick());
        buttonContainer.appendChild(this.actionButton);
        
        container.appendChild(buttonContainer);
        
        return container;
    }

    /**
     * Handle click on the Fill Document button
     */
    private onFillClick() {
        if (!this.service) return;
        
        // Update user context if available
        if (this.contextTextarea) {
            this.service.setUserContext(this.contextTextarea.value || '');
        }
        
        // Show progress section
        if (this.progressElement) {
            this.progressElement.style.display = 'block';
        }
        
        // Disable buttons during processing
        this.setButtonsEnabled(false);
        
        // Set progress callback
        this.service.setProgressCallback((progress, message) => {
            this.updateProgress(progress, message);
            
            // Re-enable buttons when complete
            if (progress >= 100) {
                setTimeout(() => {
                    this.setButtonsEnabled(true);
                    
                    // Update selection status after processing completes
                    this.updateSelectionStatus();
                }, 1000);
            }
        });
        
        // Start filling document
        this.service.fillDocument();
    }

    /**
     * Handle click on the Analyze Fields button
     */
    private async onAnalyzeClick() {
        if (!this.service) return;
        
        // Update user context if available
        if (this.contextTextarea) {
            this.service.setUserContext(this.contextTextarea.value || '');
        }
        
        // Show progress section
        if (this.progressElement) {
            this.progressElement.style.display = 'block';
        }
        
        // Disable buttons during processing
        this.setButtonsEnabled(false);
        
        // Set progress callback
        this.service.setProgressCallback((progress, message) => {
            this.updateProgress(progress, message);
            
            // Re-enable buttons when complete
            if (progress >= 100) {
                setTimeout(() => {
                    this.setButtonsEnabled(true);
                }, 1000);
            }
        });
        
        // Get whether we're working with a selection
        const isSelection = this.service.isWorkingWithSelection();
        
        // Start analyzing document
        const result = await this.service.analyzeDocument();
        
        if (result) {
            // Create a pretty display of the analysis
            this.showAnalysisResult(result, isSelection);
        }
    }

    /**
     * Display analysis results in a user-friendly way
     */
    private showAnalysisResult(result: string, isSelection: boolean = false) {
        // Format the result string
        const formattedResult = this.formatAnalysisResult(result);
        
        // Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.className = 'aie-modal-container';
        modalContainer.style.position = 'fixed';
        modalContainer.style.top = '0';
        modalContainer.style.left = '0';
        modalContainer.style.width = '100%';
        modalContainer.style.height = '100%';
        modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modalContainer.style.display = 'flex';
        modalContainer.style.justifyContent = 'center';
        modalContainer.style.alignItems = 'center';
        modalContainer.style.zIndex = '9999';
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'aie-modal-content';
        modalContent.style.backgroundColor = '#fff';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '8px';
        modalContent.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        modalContent.style.maxWidth = '600px';
        modalContent.style.width = '80%';
        modalContent.style.maxHeight = '80vh';
        modalContent.style.overflow = 'auto';
        
        // Create header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '15px';
        
        // Create title
        const title = document.createElement('h3');
        title.textContent = isSelection ? 'Empty Fields in Selection' : 'Empty Fields in Document';
        title.style.margin = '0';
        title.style.fontSize = '18px';
        header.appendChild(title);
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '24px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.padding = '0';
        closeButton.style.lineHeight = '1';
        closeButton.style.color = '#666';
        closeButton.onclick = () => {
            document.body.removeChild(modalContainer);
        };
        header.appendChild(closeButton);
        modalContent.appendChild(header);
        
        // Add description
        const description = document.createElement('p');
        description.textContent = 'The AI has identified the following empty fields that can be filled:';
        description.style.marginBottom = '15px';
        description.style.color = '#666';
        modalContent.appendChild(description);
        
        // Add the actual analysis result
        const resultContent = document.createElement('div');
        resultContent.className = 'aie-analysis-result';
        resultContent.innerHTML = formattedResult;
        resultContent.style.fontSize = '14px';
        resultContent.style.lineHeight = '1.5';
        resultContent.style.backgroundColor = '#f5f5f5';
        resultContent.style.padding = '15px';
        resultContent.style.borderRadius = '4px';
        resultContent.style.overflowX = 'auto';
        modalContent.appendChild(resultContent);
        
        // Add a note about what to do next
        const note = document.createElement('p');
        note.innerHTML = 'To fill these empty fields automatically, click the <strong>Fill Empty Fields</strong> button.';
        note.style.marginTop = '15px';
        note.style.fontSize = '14px';
        note.style.color = '#666';
        modalContent.appendChild(note);
        
        // Add close/fill buttons
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.justifyContent = 'flex-end';
        buttonsContainer.style.gap = '10px';
        buttonsContainer.style.marginTop = '20px';
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Close';
        cancelButton.className = 'aie-button aie-button-secondary';
        cancelButton.style.padding = '8px 16px';
        cancelButton.style.border = '1px solid #ddd';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.backgroundColor = '#f5f5f5';
        cancelButton.style.cursor = 'pointer';
        cancelButton.onclick = () => {
            document.body.removeChild(modalContainer);
        };
        buttonsContainer.appendChild(cancelButton);
        
        const fillButton = document.createElement('button');
        fillButton.textContent = isSelection ? 'Fill Empty Fields in Selection' : 'Fill Empty Fields';
        fillButton.className = 'aie-button aie-button-primary';
        fillButton.style.padding = '8px 16px';
        fillButton.style.border = 'none';
        fillButton.style.borderRadius = '4px';
        fillButton.style.backgroundColor = '#4285f4';
        fillButton.style.color = '#fff';
        fillButton.style.cursor = 'pointer';
        fillButton.onclick = () => {
            document.body.removeChild(modalContainer);
            this.onFillClick();
        };
        buttonsContainer.appendChild(fillButton);
        
        modalContent.appendChild(buttonsContainer);
        modalContainer.appendChild(modalContent);
        
        // Add to document
        document.body.appendChild(modalContainer);
    }

    /**
     * Format the analysis result into HTML
     */
    private formatAnalysisResult(result: string): string {
        // Simple formatting - replace newlines with <br> tags
        // In a real implementation, this would be more sophisticated
        const formatted = result
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^(\d+)\.\s/gm, '<strong>$1.</strong> ');
        
        return `<div class="analysis-result">${formatted}</div>`;
    }

    /**
     * Update progress display
     */
    private updateProgress(progress: number, message: string) {
        if (this.progressBar) {
            this.progressBar.style.width = `${progress}%`;
        }
        
        if (this.messageElement) {
            this.messageElement.textContent = message;
        }
    }

    /**
     * Enable or disable action buttons
     */
    private setButtonsEnabled(enabled: boolean) {
        if (this.actionButton) {
            this.actionButton.disabled = !enabled;
            this.actionButton.style.opacity = enabled ? '1' : '0.6';
            this.actionButton.style.cursor = enabled ? 'pointer' : 'not-allowed';
        }
        
        if (this.analyzeButton) {
            this.analyzeButton.disabled = !enabled;
            this.analyzeButton.style.opacity = enabled ? '1' : '0.6';
            this.analyzeButton.style.cursor = enabled ? 'pointer' : 'not-allowed';
        }
    }

    onTransaction(_: EditorEvents["transaction"]) {
        // Not needed for this component
    }
} 