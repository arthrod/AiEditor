import { AnyExtension, EditorEvents, Extension } from "@tiptap/core";
import { AiEditorOptions, InnerEditor } from "../../core/AiEditor";
import { SmartAutoCorrectOptions } from "../../extensions/SmartAutoCorrectExt";
import { validateOpenRouterConfig } from '../../util/aiAutoCorrect.ts';
import { AbstractMenuButton } from "../AbstractMenuButton";

// Reference the external variables from SmartAutoCorrectExt
declare global {
  interface Window {
    openRouterValidated: boolean;
    isOpenRouterValid: boolean;
  }
}

type SmartAutoCorrectExtension = Extension<any, SmartAutoCorrectOptions> & {
    name: 'smartAutoCorrect';
};

export class SmartAutoCorrect extends AbstractMenuButton {
    declare editor: InnerEditor;
    contextMenu: HTMLDivElement | null = null;
    declare disabled: boolean;
    
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        
        if (!this.shadowRoot) return;
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                    position: relative;
                }
                .smart-auto-correct {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 28px;
                    cursor: pointer;
                    border-radius: 4px;
                    transition: all 0.2s;
                    color: var(--aie-toolbar-icon-color);
                }
                .smart-auto-correct:hover {
                    background-color: var(--aie-toolbar-hover-bg);
                }
                .smart-auto-correct.active {
                    background-color: var(--aie-toolbar-active-bg);
                    color: var(--aie-toolbar-active-color);
                }
                .smart-auto-correct svg {
                    width: 16px;
                    height: 16px;
                }
                :host(.disabled) .smart-auto-correct {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .context-menu {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    background-color: var(--aie-dropdown-bg);
                    border-radius: 6px;
                    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
                    z-index: 1000;
                    min-width: 220px;
                    display: none;
                    padding-bottom: 6px;
                    overflow: hidden;
                }
                .context-menu.visible {
                    display: block;
                }
                .context-menu-item {
                    padding: 8px 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    color: var(--aie-toolbar-text-color);
                    transition: background-color 0.2s;
                }
                .context-menu-item:hover {
                    background-color: var(--aie-toolbar-hover-bg);
                }
                .context-menu-item.active {
                    color: var(--aie-toolbar-active-color);
                }
                .context-menu-item-icon {
                    margin-right: 10px;
                    display: inline-flex;
                    width: 16px;
                    height: 16px;
                    justify-content: center;
                    align-items: center;
                }
                .context-menu-separator {
                    height: 1px;
                    background-color: var(--aie-toolbar-border-color);
                    margin: 4px 12px;
                }
                .context-menu-header {
                    padding: 8px 12px;
                    font-weight: bold;
                    color: var(--aie-toolbar-text-color);
                    background-color: var(--aie-toolbar-border-color);
                    margin-bottom: 6px;
                }
                .button-row {
                    display: flex;
                    gap: 8px;
                    padding: 0 12px 6px;
                }
                .action-button {
                    flex: 1;
                    padding: 8px;
                    border-radius: 4px;
                    font-size: 13px;
                    font-weight: 500;
                    text-align: center;
                    cursor: pointer;
                    transition: opacity 0.2s;
                    color: white;
                    border: none;
                }
                .action-button:hover {
                    opacity: 0.9;
                }
                .action-button.now {
                    background-color: var(--aie-success-color, #4caf50);
                }
                .action-button.stop {
                    background-color: var(--aie-danger-color, #f44336);
                }
                .kb-shortcut {
                    margin-left: auto;
                    background-color: rgba(0,0,0,0.1);
                    padding: 2px 5px;
                    border-radius: 3px;
                    font-size: 10px;
                    font-family: monospace;
                    opacity: 0.7;
                }
                .section-title {
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--aie-toolbar-text-color);
                    opacity: 0.6;
                    text-transform: uppercase;
                    padding: 4px 12px;
                    margin-top: 8px;
                }
                .toggle-group {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                }
                .menu-footer {
                    padding: 0 12px 6px;
                    margin-top: 8px;
                }
                .full-doc-button {
                    width: 100%;
                    padding: 8px;
                    border-radius: 4px;
                    background-color: var(--aie-toolbar-active-bg, #4a7bec);
                    color: white;
                    font-weight: 500;
                    text-align: center;
                    cursor: pointer;
                }
                .full-doc-button:hover {
                    opacity: 0.9;
                }
            </style>
            <div class="smart-auto-correct" title="Smart Auto-Correct (Click for Options)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M7 4h10m-9 4h8m-7 4h6m-5 4h4"/>
                    <path d="M5 20l5-16h4l5 16M16 8l-2 3"/>
                </svg>
            </div>
            <div class="context-menu">
                <div class="context-menu-header">Smart Auto-Correct</div>
                
                <div class="button-row">
                    <div class="action-button now correct-now">Correct Now</div>
                    <div class="action-button stop stop-correction">Stop</div>
                </div>
                
                <div class="context-menu-item toggle-enabled">
                    <span class="context-menu-item-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                            <polyline points="9 11 12 14 22 4"></polyline>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                        </svg>
                    </span>
                    <span>Enable Auto-Correct</span>
                </div>

                <div class="context-menu-separator"></div>
                
                <div class="section-title">Features</div>
                
                <div class="toggle-group">
                    <div class="context-menu-item toggle-ai">
                        <span class="context-menu-item-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                <line x1="8" y1="21" x2="16" y2="21"></line>
                                <line x1="12" y1="17" x2="12" y2="21"></line>
                            </svg>
                        </span>
                        <span>AI Corrections</span>
                    </div>
                    <div class="context-menu-item toggle-capitalize">
                        <span class="context-menu-item-icon">Aa</span>
                        <span>Auto-Capitalize</span>
                    </div>
                    <div class="context-menu-item toggle-typos">
                        <span class="context-menu-item-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                <path d="M7 8h10M7 12h4m1 8l4-16"></path>
                            </svg>
                        </span>
                        <span>Fix Typos</span>
                    </div>
                    <div class="context-menu-item toggle-punctuation">
                        <span class="context-menu-item-icon">!</span>
                        <span>Punctuation</span>
                    </div>
                    <div class="context-menu-item toggle-quotes">
                        <span class="context-menu-item-icon">"</span>
                        <span>Smart Quotes</span>
                    </div>
                    <div class="context-menu-item retry-ai">
                        <span class="context-menu-item-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                <path d="M3 3v5h5"></path>
                            </svg>
                        </span>
                        <span>Retry AI</span>
                    </div>
                </div>
                
                <div class="menu-footer">
                    <div class="full-doc-button start-correction">
                        Correct Full Document
                        <span style="font-size: 10px; opacity: 0.8; margin-left: 5px;">Alt+Shift+C</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    connectedCallback() {
        if (!this.shadowRoot) return;
        
        const button = this.shadowRoot.querySelector('.smart-auto-correct');
        const contextMenu = this.shadowRoot.querySelector('.context-menu');
        if (!button || !contextMenu) return;
        
        this.contextMenu = contextMenu as HTMLDivElement;
        
        // Handle main button click to show context menu
        button.addEventListener('click', (event: Event) => {
            event.stopPropagation();
            if (this.disabled) return;
            
            // Show context menu on regular click
            this.toggleContextMenu();
        });
        
        // Setup context menu items
        this.setupContextMenuHandlers();
        
        // Close context menu when clicking outside
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
        
        // Update initial states
        this.updateActiveState();
    }
    
    // Required by AbstractMenuButton
    onCreate(event: EditorEvents["create"], options: AiEditorOptions) {
        this.editor = event.editor as unknown as InnerEditor;
        this.updateActiveState();
    }
    
    onTransaction() {
        this.updateActiveState();
    }
    
    // Optional methods
    onEditableChange(editable: boolean) {
        this.disabled = !editable;
        if (this.disabled) {
            this.classList.add('disabled');
            this.hideContextMenu();
        } else {
            this.classList.remove('disabled');
        }
    }
    
    private toggleContextMenu() {
        if (!this.contextMenu) return;
        
        const isVisible = this.contextMenu.classList.contains('visible');
        if (isVisible) {
            this.hideContextMenu();
        } else {
            this.contextMenu.classList.add('visible');
            this.updateContextMenuState();
        }
    }
    
    private hideContextMenu() {
        if (!this.contextMenu) return;
        this.contextMenu.classList.remove('visible');
    }
    
    private setupContextMenuHandlers() {
        if (!this.shadowRoot) return;
        
        const toggleEnabled = this.shadowRoot.querySelector('.toggle-enabled');
        const toggleAI = this.shadowRoot.querySelector('.toggle-ai');
        const toggleCapitalize = this.shadowRoot.querySelector('.toggle-capitalize');
        const toggleTypos = this.shadowRoot.querySelector('.toggle-typos');
        const togglePunctuation = this.shadowRoot.querySelector('.toggle-punctuation');
        const toggleQuotes = this.shadowRoot.querySelector('.toggle-quotes');
        const startCorrection = this.shadowRoot.querySelector('.start-correction');
        const correctNow = this.shadowRoot.querySelector('.correct-now');
        const stopCorrection = this.shadowRoot.querySelector('.stop-correction');
        const retryAI = this.shadowRoot.querySelector('.retry-ai');
        
        toggleEnabled?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleOption('enabled');
            this.hideContextMenu();
        });
        
        toggleAI?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleOption('useAI');
            
            // When enabling AI, check if OpenRouter needs validation
            if (this.editor) {
                const extensions = this.editor.extensionManager.extensions;
                const smartAutoCorrectExt = extensions.find((ext: AnyExtension): ext is SmartAutoCorrectExtension => 
                    ext.name === 'smartAutoCorrect' && 'options' in ext
                );
                
                if (smartAutoCorrectExt && smartAutoCorrectExt.options.useAI) {
                    console.log('[SmartAutoCorrect] AI enabled, validating OpenRouter...');
                    this.validateOpenRouter();
                }
            }
        });
        
        toggleCapitalize?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleOption('capitalizeFirstLetter');
        });
        
        toggleTypos?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleOption('fixCommonTypos');
        });
        
        togglePunctuation?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleOption('fixPunctuation');
        });
        
        toggleQuotes?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleOption('smartQuotes');
        });
        
        startCorrection?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.startFullDocumentCorrection();
            this.hideContextMenu();
        });

        correctNow?.addEventListener('click', (e) => {
            e.stopPropagation();
            // Run immediate correction on current selection or paragraph
            this.correctNowAction();
            this.hideContextMenu();
        });
        
        stopCorrection?.addEventListener('click', (e) => {
            e.stopPropagation();
            // Temporarily stop auto-correction
            this.stopAutoCorrectAction();
            this.hideContextMenu();
        });
        
        retryAI?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.validateOpenRouter(true);
        });
    }
    
    private toggleOption(optionName: keyof SmartAutoCorrectOptions) {
        if (!this.editor) return;
        
        const extensions = this.editor.extensionManager.extensions;
        const smartAutoCorrectExt = extensions.find((ext: AnyExtension): ext is SmartAutoCorrectExtension => 
            ext.name === 'smartAutoCorrect' && 'options' in ext
        );
        
        if (smartAutoCorrectExt) {
            // Toggle the specified option
            const currentValue = smartAutoCorrectExt.options[optionName];
            smartAutoCorrectExt.options[optionName] = !currentValue;
            
            // Special case for enabled - update button state
            if (optionName === 'enabled') {
                this.updateActiveState();
            } else {
                // Update context menu visuals
                this.updateContextMenuState();
            }
        }
    }
    
    private updateContextMenuState() {
        if (!this.shadowRoot || !this.editor) return;
        
        const extensions = this.editor.extensionManager.extensions;
        const smartAutoCorrectExt = extensions.find((ext: AnyExtension): ext is SmartAutoCorrectExtension => 
            ext.name === 'smartAutoCorrect' && 'options' in ext
        );
        
        if (smartAutoCorrectExt) {
            const options = smartAutoCorrectExt.options;
            
            // Update each menu item to show active state
            this.updateMenuItemState('.toggle-enabled', options.enabled);
            this.updateMenuItemState('.toggle-ai', options.useAI);
            this.updateMenuItemState('.toggle-capitalize', options.capitalizeFirstLetter);
            this.updateMenuItemState('.toggle-typos', options.fixCommonTypos);
            this.updateMenuItemState('.toggle-punctuation', options.fixPunctuation);
            this.updateMenuItemState('.toggle-quotes', options.smartQuotes);
            
            // Update the toggle-enabled text based on current state
            const toggleEnabledElement = this.shadowRoot?.querySelector('.toggle-enabled span:last-child');
            if (toggleEnabledElement) {
                toggleEnabledElement.textContent = options.enabled ? 'Disable Auto-Correct' : 'Enable Auto-Correct';
            }
        }
    }
    
    private updateMenuItemState(selector: string, isActive: boolean) {
        if (!this.shadowRoot) return;
        
        const item = this.shadowRoot.querySelector(selector);
        if (item) {
            if (isActive) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        }
    }
    
    private toggleAutoCorrect() {
        if (!this.editor) return;
        
        const extensions = this.editor.extensionManager.extensions;
        const smartAutoCorrectExt = extensions.find((ext: AnyExtension): ext is SmartAutoCorrectExtension => 
            ext.name === 'smartAutoCorrect' && 'options' in ext
        );
        
        if (smartAutoCorrectExt) {
            // Toggle the enabled option
            const newEnabled = !smartAutoCorrectExt.options.enabled;
            
            // Update the extension options
            smartAutoCorrectExt.options.enabled = newEnabled;
            
            // Update the button state
            this.updateActiveState();
        }
    }
    
    private startFullDocumentCorrection() {
        if (!this.editor) return;
        
        // First make sure auto-correct is enabled
        const extensions = this.editor.extensionManager.extensions;
        const smartAutoCorrectExt = extensions.find((ext: AnyExtension): ext is SmartAutoCorrectExtension => 
            ext.name === 'smartAutoCorrect' && 'options' in ext
        );
        
        if (smartAutoCorrectExt && !smartAutoCorrectExt.options.enabled) {
            // Temporarily enable auto-correct for this operation
            const wasDisabled = true;
            smartAutoCorrectExt.options.enabled = true;
            
            // Process the entire document
            this.correctFullDocument();
            
            // If it was disabled before, disable it again
            if (wasDisabled) {
                smartAutoCorrectExt.options.enabled = false;
            }
            
            // Update button state
            this.updateActiveState();
        } else {
            // Just process the document if auto-correct is already enabled
            this.correctFullDocument();
        }
    }
    
    private correctFullDocument() {
        if (!this.editor) return;
        
        // Use the new dedicated command for full document correction
        this.editor.commands.correctFullDocument();
    }
    
    private runManualCorrection() {
        if (!this.editor) return;
        
        // Execute the correction command
        this.editor.commands.correctSelection();
    }
    
    private updateActiveState() {
        if (!this.shadowRoot) return;
        
        const button = this.shadowRoot.querySelector('.smart-auto-correct');
        if (!button) return;
        
        if (!this.editor) return;
        
        const extensions = this.editor.extensionManager.extensions;
        const smartAutoCorrectExt = extensions.find((ext: AnyExtension): ext is SmartAutoCorrectExtension => 
            ext.name === 'smartAutoCorrect' && 'options' in ext
        );
        
        if (smartAutoCorrectExt && smartAutoCorrectExt.options.enabled) {
            button.classList.add('active');
            // Update title to show AI status
            if (smartAutoCorrectExt.options.useAI) {
                button.setAttribute('title', 'Smart Auto-Correct (AI Enabled) - Click for Options');
            } else {
                button.setAttribute('title', 'Smart Auto-Correct - Click for Options');
            }
        } else {
            button.classList.remove('active');
            button.setAttribute('title', 'Smart Auto-Correct (Disabled) - Click for Options');
        }
    }
    
    private validateOpenRouter(forceRetry = false) {
        if (forceRetry || !window.openRouterValidated) {
            console.log('[SmartAutoCorrect] Validating OpenRouter configuration...');
            window.openRouterValidated = true;
            
            validateOpenRouterConfig().then((isValid: boolean) => {
                window.isOpenRouterValid = isValid;
                if (!isValid) {
                    console.warn('[SmartAutoCorrect] OpenRouter validation failed. Check your API key and network connection.');
                    alert('OpenRouter connection failed. AI corrections will not be available until connection is restored.');
                } else {
                    console.log('[SmartAutoCorrect] OpenRouter validation successful!');
                    alert('OpenRouter connection successful! AI-powered corrections are now available.');
                }
            }).catch((error: Error) => {
                console.error('[SmartAutoCorrect] Error validating OpenRouter:', error);
                window.isOpenRouterValid = false;
                alert('Error connecting to OpenRouter. Please check your network connection and API key.');
            });
        }
    }

    // Add new methods for the Correct Now and Stop Auto-Correct buttons
    correctNowAction() {
        if (!this.editor) return;
        
        // Check if there's a selection, otherwise select the current paragraph
        const { state } = this.editor;
        const { from, to, empty } = state.selection;
        
        if (empty) {
            // Ask for context first via a small dialog
            const contextDialog = document.createElement('div');
            contextDialog.className = 'aie-context-dialog';
            contextDialog.style.position = 'fixed';
            contextDialog.style.top = '50%';
            contextDialog.style.left = '50%';
            contextDialog.style.transform = 'translate(-50%, -50%)';
            contextDialog.style.background = 'var(--aie-dropdown-bg, white)';
            contextDialog.style.padding = '20px';
            contextDialog.style.borderRadius = '8px';
            contextDialog.style.boxShadow = '0 3px 12px rgba(0, 0, 0, 0.2)';
            contextDialog.style.zIndex = '10000';
            contextDialog.style.width = '400px';
            contextDialog.style.maxWidth = '90vw';
            
            contextDialog.innerHTML = `
                <div style="font-size: 16px; font-weight: 500; margin-bottom: 15px;">Provide Context (Optional)</div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Add context to help AI better understand your text:</label>
                    <textarea id="context-input" style="width: 100%; height: 100px; padding: 8px; border: 1px solid var(--aie-toolbar-border-color, #ccc); border-radius: 4px; resize: vertical;"></textarea>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="skip-context" style="padding: 8px 16px; background: var(--aie-toolbar-hover-bg, #f0f0f0); color: var(--aie-toolbar-text-color, black); border: 1px solid var(--aie-toolbar-border-color, #ccc); border-radius: 4px; cursor: pointer;">Skip</button>
                    <button id="apply-with-context" style="padding: 8px 16px; background: var(--aie-toolbar-active-bg, #4a7bec); color: white; border: none; border-radius: 4px; cursor: pointer;">Continue</button>
                </div>
            `;
            
            document.body.appendChild(contextDialog);
            
            // Focus the textarea
            const textarea = contextDialog.querySelector('#context-input') as HTMLTextAreaElement;
            if (textarea) {
                textarea.focus();
            }
            
            // Add event listeners
            const skipBtn = contextDialog.querySelector('#skip-context');
            const applyBtn = contextDialog.querySelector('#apply-with-context');
            
            skipBtn?.addEventListener('click', () => {
                contextDialog.remove();
                // Run the correction command without context
                this.editor?.commands.correctSelection();
                this.showFeedbackMessage('Correction applied!', 'success');
            });
            
            applyBtn?.addEventListener('click', () => {
                const context = textarea?.value || '';
                contextDialog.remove();
                
                // Show a loading message
                this.showFeedbackMessage('Applying context-aware correction...', 'info', true);
                
                // Get the current selection
                const { state } = this.editor;
                const { from, to } = state.selection;
                
                // If a paragraph is selected
                if (from !== to) {
                    const selectedText = state.doc.textBetween(from, to, ' ', ' ');
                    
                    // Use our enhanced API with context
                    import('../../util/aiAutoCorrect').then(({ debouncedAiCorrect }) => {
                        debouncedAiCorrect(selectedText, false, context).then(correctedText => {
                            if (correctedText !== selectedText) {
                                // Apply the correction
                                this.editor?.commands.insertContentAt({ from, to }, correctedText);
                                this.showFeedbackMessage('Context-aware correction applied!', 'success');
                            } else {
                                this.showFeedbackMessage('No changes needed with the provided context', 'info');
                            }
                        }).catch(error => {
                            console.error('[SmartAutoCorrect] Error in context-aware correction:', error);
                            this.showFeedbackMessage('Error applying context-aware correction', 'error');
                        });
                    });
                } else {
                    // If nothing is selected, just run the correction command
                    this.editor?.commands.correctSelection();
                    this.showFeedbackMessage('Correction applied!', 'success');
                }
            });
            
            // Close on escape key
            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    contextDialog.remove();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        } else {
            // Run the correction command on the current selection
            this.editor.commands.correctSelection();
            
            // Show a notification that correction has been applied
            this.showFeedbackMessage('Correction applied!', 'success');
        }
    }

    stopAutoCorrectAction() {
        if (!this.editor) return;
        
        const extensions = this.editor.extensionManager.extensions;
        const smartAutoCorrectExt = extensions.find((ext: AnyExtension): ext is SmartAutoCorrectExtension => 
            ext.name === 'smartAutoCorrect' && 'options' in ext
        );
        
        if (smartAutoCorrectExt) {
            // Store the previous state to restore later
            const previousState = {
                enabled: smartAutoCorrectExt.options.enabled,
                useAI: smartAutoCorrectExt.options.useAI
            };
            
            // Disable auto-correct temporarily
            smartAutoCorrectExt.options.enabled = false;
            
            // Update UI
            this.updateActiveState();
            
            // Show notification
            this.showFeedbackMessage('Auto-correct paused', 'info');
            
            // After 30 minutes, offer to re-enable
            setTimeout(() => {
                if (!smartAutoCorrectExt.options.enabled) {
                    if (confirm('Auto-correct has been paused for 30 minutes. Would you like to re-enable it?')) {
                        smartAutoCorrectExt.options.enabled = previousState.enabled;
                        smartAutoCorrectExt.options.useAI = previousState.useAI;
                        this.updateActiveState();
                        this.showFeedbackMessage('Auto-correct re-enabled', 'success');
                    }
                }
            }, 30 * 60 * 1000); // 30 minutes
        }
    }

    // Show a temporary feedback message
    showFeedbackMessage(message: string, type: 'success' | 'info' | 'error', isLoading = false) {
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `autocorrect-feedback ${type}`;
        
        // Add a loading spinner if requested
        if (isLoading) {
            messageEl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="loading-spinner" style="animation: spin 1s linear infinite;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 6v6l4 2"></path>
                    </svg>
                    <span>${message}</span>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        } else {
            messageEl.textContent = message;
        }
        
        messageEl.style.position = 'fixed';
        messageEl.style.bottom = '20px';
        messageEl.style.right = '20px';
        messageEl.style.backgroundColor = type === 'success' ? 'var(--aie-success-color, #4caf50)' : 
                                        type === 'error' ? 'var(--aie-danger-color, #f44336)' : 
                                        'var(--aie-toolbar-active-bg, #4a7bec)';
        messageEl.style.color = 'white';
        messageEl.style.padding = '10px 16px';
        messageEl.style.borderRadius = '4px';
        messageEl.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
        messageEl.style.zIndex = '10000';
        messageEl.style.transition = 'opacity 0.3s, transform 0.3s';
        messageEl.style.opacity = '0';
        messageEl.style.transform = 'translateY(20px)';
        
        // Add to document
        document.body.appendChild(messageEl);
        
        // Animate in
        setTimeout(() => {
            messageEl.style.opacity = '1';
            messageEl.style.transform = 'translateY(0)';
        }, 10);
        
        // Remove after a delay (longer if loading)
        const removeDelay = isLoading ? 10000 : 3000;
        
        setTimeout(() => {
            messageEl.style.opacity = '0';
            messageEl.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, removeDelay);
        
        // Store the element so we can remove it early if needed
        return messageEl;
    }
}

// Register the custom element
customElements.define('aie-smart-auto-correct', SmartAutoCorrect);
