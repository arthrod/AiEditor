import { InnerEditor } from "../../core/AiEditor";
import { AiModelManager } from "../AiModelManager";
import { DefaultAiMessageListener } from "../core/DefaultAiMessageListener";
import {
    PAPER_ANALYZE_PROMPT,
    PAPER_ANALYZE_WITH_CONTEXT_PROMPT,
    PAPER_FILL_PROMPT,
    PAPER_FILL_WITH_CONTEXT_PROMPT
} from "./PaperFillPrompts";

/**
 * Service for handling Smart Paper Fill functionality
 */
export class SmartPaperFillService {
    private editor: InnerEditor;
    private isProcessing: boolean = false;
    private progressCallback?: (progress: number, message: string) => void;
    private userContext: string = '';
    private hasSelection: boolean = false;
    private selectionContent: string = '';
    private selectionFrom: number = 0;
    private selectionTo: number = 0;

    constructor(editor: InnerEditor) {
        this.editor = editor;
    }

    /**
     * Set a callback for progress updates
     */
    setProgressCallback(callback: (progress: number, message: string) => void) {
        this.progressCallback = callback;
    }

    /**
     * Set user context for better AI understanding
     * @param context The context information provided by the user
     */
    setUserContext(context: string) {
        this.userContext = context;
    }

    /**
     * Get the current user context
     */
    getUserContext(): string {
        return this.userContext;
    }

    /**
     * Check if there is text selected in the editor
     * @returns True if there is a non-empty selection
     */
    private checkForSelection(): boolean {
        const { state } = this.editor;
        const { from, to, empty } = state.selection;
        
        if (!empty) {
            const selectedText = this.editor.getText(from, to);
            if (selectedText && selectedText.trim().length > 0) {
                // Store selection information for later use
                this.hasSelection = true;
                this.selectionContent = selectedText;
                this.selectionFrom = from;
                this.selectionTo = to;
                return true;
            }
        }
        
        // No valid selection
        this.hasSelection = false;
        this.selectionContent = '';
        this.selectionFrom = 0;
        this.selectionTo = 0;
        return false;
    }

    /**
     * Get the document content or selected text
     */
    public getContentToProcess(): string {
        // Check for selection first
        if (this.checkForSelection()) {
            return this.selectionContent;
        }
        
        // Fall back to entire document if no selection
        return this.editor.getHTML();
    }

    /**
     * Update progress status
     */
    private updateProgress(progress: number, message: string) {
        if (this.progressCallback) {
            this.progressCallback(progress, message);
        }
    }

    /**
     * Fill the document or selected text using AI
     */
    async fillDocument(): Promise<boolean> {
        if (this.isProcessing) {
            return false;
        }

        this.isProcessing = true;
        this.updateProgress(0, "Starting content analysis...");

        try {
            // Check for selection first, then get appropriate content
            const contentToProcess = this.getContentToProcess();
            const workingWithSelection = this.hasSelection;
            
            // Check if there's content to process
            if (!contentToProcess || contentToProcess.trim().length === 0) {
                this.updateProgress(100, "No content to process");
                this.isProcessing = false;
                return false;
            }

            this.updateProgress(20, workingWithSelection ? 
                "Analyzing selected text..." : 
                "Analyzing document structure...");

            // First, analyze the document to identify empty fields that need to be filled
            const fieldsToFill = await this.identifyEmptyFields(contentToProcess);
            
            if (!fieldsToFill || fieldsToFill.length === 0) {
                this.updateProgress(100, "No empty fields found to fill");
                this.isProcessing = false;
                return false;
            }
            
            this.updateProgress(30, `Found ${fieldsToFill.length} fields to fill...`);

            // Create the prompt for filling the content
            let prompt;
            if (this.userContext) {
                // Use context-aware prompt if user provided context
                prompt = PAPER_FILL_WITH_CONTEXT_PROMPT
                    .replace("{content}", contentToProcess)
                    .replace("{userContext}", this.userContext);
            } else {
                // Use standard prompt if no context
                prompt = PAPER_FILL_PROMPT.replace("{content}", contentToProcess);
            }
            
            // Add specific instruction to only fill empty fields
            prompt += "\n\nIMPORTANT: DO NOT OVERWRITE OR MODIFY ANY EXISTING TEXT. Only fill in empty fields, form inputs, or blank sections. Leave all pre-filled content unchanged.";

            // Get the configured AI model
            const modelName = this.editor.aiEditor.options.ai?.bubblePanelModel || "openrouter";
            const model = AiModelManager.get(modelName);
            
            if (!model) {
                this.updateProgress(100, "AI model not available");
                this.isProcessing = false;
                return false;
            }

            this.updateProgress(40, "Processing with AI model...");

            // Create a promise that will be resolved when AI processing completes
            return new Promise((resolve) => {
                let generatedContent = "";
                
                // Create a listener that will handle the AI response
                const listener = new DefaultAiMessageListener(this.editor);
                
                // Override the default message handler to capture the content
                listener.onMessage = (message) => {
                    if (message.content) {
                        generatedContent += message.content;
                    }
                    
                    // Update progress based on message status
                    if (message.status === 1) {
                        this.updateProgress(60, "Generating content...");
                    } else if (message.status === 2) {
                        this.updateProgress(80, "Finalizing content...");
                        
                        // When complete, update the editor with the filled content
                        setTimeout(() => {
                            if (workingWithSelection) {
                                // Check if the generated content is different than the selected text
                                if (this.selectionContent !== generatedContent) {
                                    // Instead of directly replacing, intelligently merge the changes
                                    const mergedContent = this.mergeChanges(this.selectionContent, generatedContent);
                                    
                                    this.editor.commands.deleteRange({
                                        from: this.selectionFrom,
                                        to: this.selectionTo
                                    });
                                    this.editor.commands.insertContentAt(this.selectionFrom, mergedContent);
                                    this.updateProgress(100, "Selection fields filled successfully!");
                                } else {
                                    this.updateProgress(100, "No changes needed for selection");
                                }
                            } else {
                                // For the entire document, merge changes instead of replacing
                                const originalContent = this.editor.getHTML();
                                const mergedContent = this.mergeChanges(originalContent, generatedContent);
                                
                                // Only update if there are actual changes
                                if (originalContent !== mergedContent) {
                                    this.editor.commands.setContent(mergedContent);
                                    this.updateProgress(100, "Document fields filled successfully!");
                                } else {
                                    this.updateProgress(100, "No changes needed for document");
                                }
                            }
                            this.isProcessing = false;
                            resolve(true);
                        }, 300);
                    }
                };
                
                // Initialize the original message handlers
                const originalOnStart = listener.onStart;
                const originalOnStop = listener.onStop;
                
                // Override start handler
                listener.onStart = (client) => {
                    this.updateProgress(50, "AI processing started...");
                    if (originalOnStart) originalOnStart(client);
                };
                
                // Override stop handler
                listener.onStop = () => {
                    if (originalOnStop) originalOnStop();
                    if (this.isProcessing) {
                        this.updateProgress(100, "Processing completed");
                        this.isProcessing = false;
                        resolve(false);
                    }
                };
                
                // Start the AI processing
                model.chat(contentToProcess, prompt, listener);
            });
        } catch (error) {
            console.error("Error in Smart Paper Fill:", error);
            this.updateProgress(100, "Error occurred while processing");
            this.isProcessing = false;
            return false;
        }
    }

    /**
     * Identify empty fields in the content that need to be filled
     * @param content The HTML content to analyze
     * @returns Array of identified empty fields
     */
    private async identifyEmptyFields(content: string): Promise<any[]> {
        try {
            // Parse the HTML content
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            
            const emptyFields: any[] = [];
            
            // Look for common form elements that might be empty
            // 1. Input fields with empty value
            const inputs = doc.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input:not([type])');
            inputs.forEach((input: Element, index) => {
                const inputEl = input as HTMLInputElement;
                if (!inputEl.value || inputEl.value.trim() === '') {
                    emptyFields.push({
                        type: 'input',
                        id: inputEl.id || `input-${index}`,
                        name: inputEl.name || inputEl.placeholder || '',
                        element: inputEl
                    });
                }
            });
            
            // 2. Empty textareas
            const textareas = doc.querySelectorAll('textarea');
            textareas.forEach((textarea: Element, index) => {
                const textareaEl = textarea as HTMLTextAreaElement;
                if (!textareaEl.value || textareaEl.value.trim() === '') {
                    emptyFields.push({
                        type: 'textarea',
                        id: textareaEl.id || `textarea-${index}`,
                        name: textareaEl.name || textareaEl.placeholder || '',
                        element: textareaEl
                    });
                }
            });
            
            // 3. Empty select elements (dropdowns without a selection)
            const selects = doc.querySelectorAll('select');
            selects.forEach((select: Element, index) => {
                const selectEl = select as HTMLSelectElement;
                if (!selectEl.value || selectEl.value === '' || selectEl.selectedIndex === 0) {
                    emptyFields.push({
                        type: 'select',
                        id: selectEl.id || `select-${index}`,
                        name: selectEl.name || '',
                        element: selectEl
                    });
                }
            });
            
            // 4. Look for elements with specific classes or attributes that might indicate form fields
            const potentialFields = doc.querySelectorAll('.form-field, .field, .input, [data-field], [contenteditable]');
            potentialFields.forEach((field: Element, index) => {
                // Check if field is contenteditable and empty
                if (field.hasAttribute('contenteditable') && (!field.textContent || field.textContent.trim() === '')) {
                    emptyFields.push({
                        type: 'contenteditable',
                        id: field.id || `field-${index}`,
                        name: field.getAttribute('data-name') || field.getAttribute('aria-label') || '',
                        element: field
                    });
                }
                
                // Check for elements with class indicating form fields that are empty
                if ((field.classList.contains('form-field') || field.classList.contains('field') || 
                     field.classList.contains('input') || field.hasAttribute('data-field')) && 
                    (!field.textContent || field.textContent.trim() === '')) {
                    emptyFields.push({
                        type: 'field',
                        id: field.id || `field-${index}`,
                        name: field.getAttribute('data-name') || field.getAttribute('aria-label') || '',
                        element: field
                    });
                }
            });
            
            // 5. Check for elements with placeholder text or underscores indicating blank spaces
            const placeholders = doc.querySelectorAll(
                'span:not(:empty), p:not(:empty), div:not(:empty)'
            );
            
            placeholders.forEach((el: Element) => {
                const text = el.textContent || '';
                // Check for common placeholder patterns like "__________", "______", or "[blank]"
                if (text.includes('_____') || text.includes('[blank]') || 
                    text.includes('(____') || text.includes('[____') ||
                    /\[\s*\]/.test(text) || /\(\s*\)/.test(text)) {
                    emptyFields.push({
                        type: 'placeholder',
                        id: el.id || `placeholder-${emptyFields.length}`,
                        name: '',
                        content: text,
                        element: el
                    });
                }
            });
            
            return emptyFields;
        } catch (error) {
            console.error("Error identifying empty fields:", error);
            return [];
        }
    }

    /**
     * Merge changes from AI-generated content to original content
     * Only replacing empty fields while preserving existing text
     */
    private mergeChanges(originalContent: string, newContent: string): string {
        if (originalContent === newContent) {
            return originalContent;
        }
        
        try {
            // Parse both contents
            const parser = new DOMParser();
            const originalDoc = parser.parseFromString(originalContent, 'text/html');
            const newDoc = parser.parseFromString(newContent, 'text/html');
            
            // Helper function to process an element and its children
            const processElement = (original: Element, updated: Element) => {
                // Process attributes for form elements
                if (original.tagName === 'INPUT' || original.tagName === 'TEXTAREA' || original.tagName === 'SELECT') {
                    const originalEl = original as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
                    const updatedEl = updated as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
                    
                    // If original is empty and updated has value, copy it
                    if ((!originalEl.value || originalEl.value.trim() === '') && 
                        updatedEl.value && updatedEl.value.trim() !== '') {
                        originalEl.value = updatedEl.value;
                    }
                } 
                // Handle contenteditable elements
                else if (original.hasAttribute('contenteditable')) {
                    if ((!original.textContent || original.textContent.trim() === '') && 
                        updated.textContent && updated.textContent.trim() !== '') {
                        original.textContent = updated.textContent;
                    }
                }
                // Handle placeholder elements with underscores
                else if (original.textContent && (
                    original.textContent.includes('_____') || 
                    original.textContent.includes('[blank]') ||
                    /\[\s*\]/.test(original.textContent) || 
                    /\(\s*\)/.test(original.textContent)
                )) {
                    if (updated.textContent && !updated.textContent.includes('_____') && 
                        !updated.textContent.includes('[blank]') &&
                        !/\[\s*\]/.test(updated.textContent) && 
                        !/\(\s*\)/.test(updated.textContent)) {
                        // The updated content has filled in the blank
                        original.textContent = updated.textContent;
                    }
                }
                
                // Process child elements
                if (original.children.length > 0 && updated.children.length > 0) {
                    // If they have similar structure, process recursively
                    const minLength = Math.min(original.children.length, updated.children.length);
                    for (let i = 0; i < minLength; i++) {
                        processElement(original.children[i], updated.children[i]);
                    }
                }
            };
            
            // Process the body elements
            if (originalDoc.body && newDoc.body) {
                processElement(originalDoc.body, newDoc.body);
            }
            
            // Serialize the modified original back to HTML
            return originalDoc.body.innerHTML;
        } catch (error) {
            console.error("Error merging changes:", error);
            // Fall back to original content in case of error
            return originalContent;
        }
    }

    /**
     * Analyze the document or selected text to identify fields
     */
    async analyzeDocument(): Promise<any> {
        if (this.isProcessing) {
            return null;
        }

        this.isProcessing = true;
        this.updateProgress(0, "Starting field analysis...");

        try {
            // Check for selection first, then get appropriate content
            const contentToProcess = this.getContentToProcess();
            const workingWithSelection = this.hasSelection;
            
            if (!contentToProcess || contentToProcess.trim().length === 0) {
                this.updateProgress(100, "No content to analyze");
                this.isProcessing = false;
                return null;
            }

            // Create the prompt for analyzing the content
            let prompt;
            if (this.userContext) {
                // Use context-aware prompt if user provided context
                prompt = PAPER_ANALYZE_WITH_CONTEXT_PROMPT
                    .replace("{content}", contentToProcess)
                    .replace("{userContext}", this.userContext);
            } else {
                // Use standard prompt if no context
                prompt = PAPER_ANALYZE_PROMPT.replace("{content}", contentToProcess);
            }
            
            // Get the AI model
            const modelName = this.editor.aiEditor.options.ai?.bubblePanelModel || "openrouter";
            const model = AiModelManager.get(modelName);
            
            if (!model) {
                this.updateProgress(100, "AI model not available");
                this.isProcessing = false;
                return null;
            }

            this.updateProgress(30, workingWithSelection ? 
                "Analyzing selected fields..." : 
                "Analyzing document fields...");
            
            // Create a promise for the analysis result
            return new Promise((resolve) => {
                let analysisResult = "";
                
                // Create listener for the AI response
                const listener = new DefaultAiMessageListener(this.editor);
                
                // Override message handler
                listener.onMessage = (message) => {
                    if (message.content) {
                        analysisResult += message.content;
                    }
                    
                    if (message.status === 2) {
                        this.updateProgress(90, "Analysis complete");
                        setTimeout(() => {
                            this.isProcessing = false;
                            this.updateProgress(100, "Field analysis complete");
                            resolve(analysisResult);
                        }, 300);
                    }
                };
                
                // Start the analysis
                model.chat(contentToProcess, prompt, listener);
            });
        } catch (error) {
            console.error("Error analyzing document:", error);
            this.updateProgress(100, "Error during analysis");
            this.isProcessing = false;
            return null;
        }
    }

    /**
     * Check if we're currently working with a selection
     */
    isWorkingWithSelection(): boolean {
        return this.hasSelection;
    }
} 