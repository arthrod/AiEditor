import { Extension, RawCommands } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection, Transaction } from '@tiptap/pm/state';
import { debouncedAiCorrect, validateOpenRouterConfig } from '../util/aiAutoCorrect.ts';

// Declare global for TypeScript
declare global {
  interface Window {
    openRouterValidated: boolean;
    isOpenRouterValid: boolean;
  }
}

// Add flags to track OpenRouter validation status (make them global for component access)
window.openRouterValidated = false;
window.isOpenRouterValid = false;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    smartAutoCorrect: {
      /**
       * Correct selected text or entire document
       */
      correctSelection: () => ReturnType;
      
      /**
       * Correct the entire document
       */
      correctFullDocument: () => ReturnType;
    }
  }
}

export interface SmartAutoCorrectOptions {
  enabled: boolean;
  capitalizeFirstLetter: boolean;
  fixCommonTypos: boolean;
  fixPunctuation: boolean;
  smartQuotes: boolean;
  useAI: boolean;
  aiDebounceTime: number;
  userDictionary: {
    [key: string]: string;
  };
}

/**
 * Common typos and their corrections
 */
const commonTypos: Record<string, string> = {
  'teh': 'the',
  'adn': 'and',
  'taht': 'that',
  'waht': 'what',
  'wiht': 'with',
  'hte': 'the',
  'ahve': 'have',
  'recieve': 'receive',
  'beleive': 'believe',
  'definately': 'definitely',
  'seperate': 'separate',
  'occured': 'occurred',
  'alot': 'a lot',
  'untill': 'until',
  'arent': 'aren\'t',
  'cant': 'can\'t',
  'couldnt': 'couldn\'t',
  'didnt': 'didn\'t',
  'doesnt': 'doesn\'t',
  'dont': 'don\'t',
  'hasnt': 'hasn\'t',
  'havent': 'haven\'t',
  'isnt': 'isn\'t',
  'shouldnt': 'shouldn\'t',
  'wasnt': 'wasn\'t',
  'werent': 'weren\'t',
  'wont': 'won\'t',
  'wouldnt': 'wouldn\'t'
};

/**
 * Apply smart quotes to the text
 */
function applySmartQuotes(text: string): string {
  // Replace straight quotes with smart quotes using Unicode escape sequences
  return text
    .replace(/(^|\s)"([^"]*)"(\s|$)/g, '$1\u201C$2\u201D$3')
    .replace(/(^|\s)'([^']*)'(\s|$)/g, '$1\u2018$2\u2019$3');
}

/**
 * Fix punctuation in the text
 */
function fixPunctuation(text: string): string {
  return text
    // Fix spaces before punctuation
    .replace(/\s+([.,;:!?])/g, '$1')
    // Ensure single space after punctuation
    .replace(/([.,;:!?])(?!\s|$)/g, '$1 ')
    // Fix multiple spaces
    .replace(/\s{2,}/g, ' ')
    // Fix missing space after period
    .replace(/(\.)([A-Z][a-z])/g, '$1 $2');
}

/**
 * Capitalize the first letter of a sentence
 */
function capitalizeFirstLetter(text: string): string {
  // This regex looks for sentence boundaries and capitalizes the first letter of each sentence
  return text.replace(/(^|\.\s+|\?\s+|\!\s+)([a-z])/g, function(match, p1, p2) {
    return p1 + p2.toUpperCase();
  });
}

/**
 * Apply all basic corrections to text
 */
function applyBasicCorrections(text: string, options: SmartAutoCorrectOptions, userDictionary: Record<string, string>): string {
  let newText = text;
  
  // Combine the default common typos with user-defined dictionary
  const typosMap = {
    ...commonTypos,
    ...userDictionary,
  };
  
  // Fix common typos
  if (options.fixCommonTypos) {
    const words = newText.split(/(\s+)/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word.match(/^\s+$/) && typosMap[word.toLowerCase()]) {
        words[i] = typosMap[word.toLowerCase()];
      }
    }
    newText = words.join('');
  }
  
  // Apply smart quotes
  if (options.smartQuotes) {
    newText = applySmartQuotes(newText);
  }
  
  // Fix punctuation
  if (options.fixPunctuation) {
    newText = fixPunctuation(newText);
  }
  
  // Capitalize first letter of sentences
  if (options.capitalizeFirstLetter) {
    newText = capitalizeFirstLetter(newText);
  }
  
  return newText;
}

// Track paragraphs that are currently being processed by AI
const processingParagraphs = new Set<string>();

export const SmartAutoCorrectExt = Extension.create<SmartAutoCorrectOptions>({
  name: 'smartAutoCorrect',

  priority: 100,

  // Add methods to the extension object
  addStorage() {
    return {
      bubbleMenu: null as HTMLElement | null,
      correctionContext: null as string | null,  // Store user-provided context for corrections
      
      showBubbleMenu(view: any, coords: {top: number, left: number}, state: 'loading' | 'unchanged' | 'corrected', text: string, correctedText?: string, from?: number, to?: number) {
        this.hideBubbleMenu(); // Remove any existing bubble menu
        
        const bubbleMenu = document.createElement('div');
        bubbleMenu.id = 'smart-autocorrect-bubble';
        bubbleMenu.style.position = 'absolute';
        
        // Adjust position to be above the text rather than directly on it
        bubbleMenu.style.top = `${coords.top - 10}px`;
        bubbleMenu.style.left = `${coords.left}px`;
        bubbleMenu.style.transform = 'translateY(-100%)'; // Position above the cursor
        bubbleMenu.style.zIndex = '1000';
        bubbleMenu.style.backgroundColor = 'var(--aie-dropdown-bg, white)';
        bubbleMenu.style.borderRadius = '6px';
        bubbleMenu.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.2)';
        bubbleMenu.style.padding = '10px';
        bubbleMenu.style.maxWidth = '320px';
        bubbleMenu.style.width = 'max-content';
        
        // Add a subtle arrow pointing to the text
        bubbleMenu.style.setProperty('--arrow-size', '8px');
        bubbleMenu.style.setProperty('--arrow-color', 'var(--aie-dropdown-bg, white)');
        
        if (state === 'loading') {
          bubbleMenu.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; color: var(--aie-toolbar-text-color, black);">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="loading-spinner">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
              <span>AI Correcting...</span>
            </div>
            <style>
              .loading-spinner {
                animation: spin 1.5s linear infinite;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              #smart-autocorrect-bubble::after {
                content: '';
                position: absolute;
                bottom: -8px;
                left: 20px;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 8px solid var(--aie-dropdown-bg, white);
              }
            </style>
          `;
        } else if (state === 'unchanged') {
          bubbleMenu.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px; color: var(--aie-toolbar-text-color, black);">
              <div style="font-size: 12px; padding: 6px; color: var(--aie-toolbar-text-color, black); background-color: var(--aie-toolbar-hover-bg, #f5f5f5); border-radius: 4px;">
                <div style="font-weight: 500; margin-bottom: 4px;">AI found no issues to correct</div>
                <div style="font-size: 11px; opacity: 0.8;">Text appears to be grammatically correct.</div>
              </div>
              <div>
                <label style="font-size: 11px; font-weight: 500; margin-bottom: 4px; display: block;">Provide additional context (optional):</label>
                <textarea id="correction-context" style="width: 100%; padding: 4px; border-radius: 4px; border: 1px solid var(--aie-toolbar-border-color, #ccc); font-size: 12px; height: 60px; resize: vertical; margin-bottom: 6px;" placeholder="Add context to help AI better understand what you're writing about..."></textarea>
              </div>
              <div style="display: flex; gap: 4px;">
                <button id="retry-with-context" style="background: var(--aie-toolbar-active-bg, #4a7bec); color: var(--aie-toolbar-active-color, white); border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 12px; flex-grow: 1; display: flex; align-items: center; justify-content: center; gap: 4px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                    <path d="M3 3v5h5"></path>
                  </svg>
                  <span>Retry with Context</span>
                </button>
                <button id="edit-manual" style="background: var(--aie-toolbar-hover-bg, #f0f0f0); color: var(--aie-toolbar-text-color, black); border: 1px solid var(--aie-toolbar-border-color, #ccc); border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 12px;">
                  Edit Manually
                </button>
                <button id="discard-correction" style="background: var(--aie-toolbar-hover-bg, #f0f0f0); color: var(--aie-toolbar-text-color, black); border: 1px solid var(--aie-toolbar-border-color, #ccc); border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 12px;">
                  Dismiss
                </button>
              </div>
            </div>
            <style>
              #smart-autocorrect-bubble::after {
                content: '';
                position: absolute;
                bottom: -8px;
                left: 20px;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 8px solid var(--aie-dropdown-bg, white);
              }
            </style>
          `;
        } else if (state === 'corrected' && correctedText) {
          const diff = this.generateTextDiff(text, correctedText);
          bubbleMenu.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px; color: var(--aie-toolbar-text-color, black);">
              <div style="font-size: 12px; padding: 6px; color: var(--aie-toolbar-text-color, black); background-color: var(--aie-success-color, #4caf50); color: white; border-radius: 4px; opacity: 0.9;">
                <div style="font-weight: 500; margin-bottom: 4px;">Auto-Correct Suggestions</div>
              </div>
              <div style="font-size: 12px; padding: 6px; background-color: var(--aie-toolbar-hover-bg, #f5f5f5); border-radius: 4px; max-height: 100px; overflow-y: auto;">
                ${diff}
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <button id="apply-correction" style="background: var(--aie-success-color, #4caf50); color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Apply</span>
                </button>
                <button id="append-correction" style="background: var(--aie-toolbar-active-bg, #4a7bec); color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; gap: 4px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="12 19 19 12 12 5"></polyline>
                    <polyline points="5 12 19 12"></polyline>
                  </svg>
                  <span>Append</span>
                </button>
                <button id="edit-manual" style="background: var(--aie-toolbar-hover-bg, #f0f0f0); color: var(--aie-toolbar-text-color, black); border: 1px solid var(--aie-toolbar-border-color, #ccc); border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 12px; grid-column: 1; display: flex; align-items: center; justify-content: center; gap: 4px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>Edit</span>
                </button>
                <button id="discard-correction" style="background: var(--aie-toolbar-hover-bg, #f0f0f0); color: var(--aie-toolbar-text-color, black); border: 1px solid var(--aie-toolbar-border-color, #ccc); border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 12px; grid-column: 2; display: flex; align-items: center; justify-content: center; gap: 4px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Discard</span>
                </button>
              </div>
              <div style="font-size: 10px; color: var(--aie-toolbar-text-color, black); opacity: 0.7; text-align: center; margin-top: 4px;">
                Corrections are automatically saved as your preferences for future use.
              </div>
            </div>
            <style>
              #smart-autocorrect-bubble::after {
                content: '';
                position: absolute;
                bottom: -8px;
                left: 20px;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 8px solid var(--aie-dropdown-bg, white);
              }
              .diff-added {
                background-color: rgba(76, 175, 80, 0.2);
                text-decoration: none;
                padding: 0 2px;
                border-radius: 2px;
              }
              .diff-removed {
                background-color: rgba(244, 67, 54, 0.2);
                text-decoration: line-through;
                padding: 0 2px;
                border-radius: 2px;
              }
            </style>
          `;
        }
        
        document.body.appendChild(bubbleMenu);
        this.bubbleMenu = bubbleMenu;
        
        // Add event listeners based on the bubble menu state
        if (state === 'unchanged' && from !== undefined && to !== undefined) {
          const editButton = document.getElementById('edit-manual');
          const discardButton = document.getElementById('discard-correction');
          const retryButton = document.getElementById('retry-with-context');
          const contextTextarea = document.getElementById('correction-context') as HTMLTextAreaElement;
          
          editButton?.addEventListener('click', () => {
            // Focus the editor at the selection position
            view.focus();
            
            // Create a proper text selection instead of using constructor
            const tr = view.state.tr;
            
            // Create a text selection from the stored positions
            const selection = TextSelection.create(view.state.doc, from, to);
            tr.setSelection(selection);
            
            view.dispatch(tr);
            this.hideBubbleMenu();
          });
          
          discardButton?.addEventListener('click', () => {
            this.hideBubbleMenu();
          });
          
          retryButton?.addEventListener('click', () => {
            // Store the context for the correction attempt
            this.correctionContext = contextTextarea?.value || null;
            
            // Try correction again with the provided context
            if (this.correctionContext) {
              console.log('[SmartAutoCorrect] Retrying with user context:', this.correctionContext);
              
              // Show loading indicator
              this.showBubbleMenu(view, coords, 'loading', text);
              
              // Use AI to correct with context
              this.retryWithContext(view, text, this.correctionContext, from, to);
            }
          });
        } else if (state === 'corrected' && from !== undefined && to !== undefined && correctedText) {
          const applyButton = document.getElementById('apply-correction');
          const appendButton = document.getElementById('append-correction');
          const editButton = document.getElementById('edit-manual');
          const discardButton = document.getElementById('discard-correction');
          
          applyButton?.addEventListener('click', () => {
            // Apply the correction by replacing text
            const tr = view.state.tr;
            tr.replaceWith(from, to, view.state.schema.text(correctedText));
            view.dispatch(tr);
            this.hideBubbleMenu();
          });
          
          appendButton?.addEventListener('click', () => {
            // Append the correction after the current selection
            const tr = view.state.tr;
            tr.insertText(' ' + correctedText, to);
            view.dispatch(tr);
            this.hideBubbleMenu();
          });
          
          editButton?.addEventListener('click', () => {
            // Focus the editor at the selection position
            view.focus();
            
            // Create a proper text selection instead of using constructor
            const tr = view.state.tr;
            
            // Create a text selection from the stored positions
            const selection = TextSelection.create(view.state.doc, from, to);
            tr.setSelection(selection);
            
            view.dispatch(tr);
            this.hideBubbleMenu();
          });
          
          discardButton?.addEventListener('click', () => {
            this.hideBubbleMenu();
          });
        }
        
        // Close bubble menu when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
          if (bubbleMenu && !bubbleMenu.contains(event.target as Node)) {
            this.hideBubbleMenu();
            document.removeEventListener('click', handleClickOutside);
          }
        };
        
        // Delay adding the event listener to prevent immediate closure
        setTimeout(() => {
          document.addEventListener('click', handleClickOutside);
        }, 100);
      },
      
      hideBubbleMenu() {
        if (this.bubbleMenu) {
          this.bubbleMenu.remove();
          this.bubbleMenu = null;
        }
      },
      
      // Simple text diff to highlight changes
      generateTextDiff(original: string, corrected: string): string {
        // Very basic diff implementation - in a real app you'd use a proper diff library
        if (original === corrected) return corrected;
        
        const originalWords = original.split(/\s+/);
        const correctedWords = corrected.split(/\s+/);
        let result = '';
        
        // Find the longest common subsequence
        // For simplicity, we'll just do word-by-word comparison
        for (let i = 0; i < Math.max(originalWords.length, correctedWords.length); i++) {
          const originalWord = i < originalWords.length ? originalWords[i] : null;
          const correctedWord = i < correctedWords.length ? correctedWords[i] : null;
          
          if (originalWord === correctedWord) {
            // Words are the same
            result += originalWord + ' ';
          } else {
            // Words differ
            if (originalWord) {
              result += `<span class="diff-removed">${originalWord}</span> `;
            }
            if (correctedWord) {
              result += `<span class="diff-added">${correctedWord}</span> `;
            }
          }
        }
        
        return result.trim();
      },
      
      // Retry the correction with user-provided context
      async retryWithContext(view: any, text: string, context: string, from: number, to: number) {
        try {
          // Create a more detailed prompt with the user's context
          const result = await debouncedAiCorrect(text, false, context);
          
          if (result !== text) {
            console.log('[SmartAutoCorrect] Context-aware correction result:', result);
            
            // Show the correction options
            const coords = view.coordsAtPos(from);
            this.showBubbleMenu(view, coords, 'corrected', text, result, from, to);
          } else {
            console.log('[SmartAutoCorrect] Context-aware correction returned unchanged text');
            const coords = view.coordsAtPos(from);
            this.showBubbleMenu(view, coords, 'unchanged', text, undefined, from, to);
          }
        } catch (error) {
          console.error('[SmartAutoCorrect] Error in context-aware correction:', error);
          this.hideBubbleMenu();
        }
      }
    };
  },

  addCommands(): Partial<RawCommands> {
    return {
      correctSelection: () => ({ tr, state, dispatch, view }) => {
        if (!dispatch || !view) return true;
        
        const { selection } = state;
        const { from, to } = selection;
        
        // Validate OpenRouter when AI is enabled and not yet validated
        if (this.options.useAI && !window.openRouterValidated) {
          window.openRouterValidated = true;
          // Run validation in the background
          validateOpenRouterConfig().then(isValid => {
            window.isOpenRouterValid = isValid;
            if (!isValid) {
              console.warn('[SmartAutoCorrect] OpenRouter validation failed, falling back to basic corrections');
              // You could show a toast/notification here if desired
            }
          });
        }
        
        // If nothing is selected, try to correct the current paragraph
        if (from === to) {
          const { doc } = state;
          const $from = state.selection.$from;
          const startOfParent = $from.start($from.depth);
          const endOfParent = $from.end($from.depth);
          
          // Get text content of the current paragraph
          const text = doc.textBetween(startOfParent, endOfParent, ' ', ' ');
          if (!text || text.trim().length === 0) return true;
          
          // Apply basic corrections
          const correctedText = applyBasicCorrections(text, this.options, this.options.userDictionary);
          
          if (this.options.useAI && (window.isOpenRouterValid || !window.openRouterValidated)) {
            console.log('[SmartAutoCorrect] Using AI for paragraph correction');
            
            // Show loading indicator
            const coords = view.coordsAtPos(startOfParent);
            this.storage.showBubbleMenu(view, coords, 'loading', text);
            
            // Use AI to correct the text
            debouncedAiCorrect(correctedText)
              .then(aiCorrectedText => {
                // Only dispatch if there's a difference
                if (aiCorrectedText !== text) {
                  console.log('[SmartAutoCorrect] AI correction applied');
                  const newTr = state.tr.replaceWith(
                    startOfParent, 
                    endOfParent,
                    state.schema.text(aiCorrectedText)
                  );
                  dispatch(newTr);
                  this.storage.hideBubbleMenu();
                } else {
                  console.log('[SmartAutoCorrect] AI correction returned unchanged text');
                  // Show bubble menu for manual correction
                  const coords = view.coordsAtPos(startOfParent);
                  this.storage.showBubbleMenu(view, coords, 'unchanged', text, startOfParent, endOfParent);
                }
              })
              .catch(error => {
                console.error('[SmartAutoCorrect] AI text correction error:', error);
                this.storage.hideBubbleMenu();
                // Fallback to basic corrections if AI fails
                if (correctedText !== text) {
                  const newTr = state.tr.replaceWith(
                    startOfParent, 
                    endOfParent,
                    state.schema.text(correctedText)
                  );
                  dispatch(newTr);
                }
              });
          } else if (correctedText !== text) {
            console.log('[SmartAutoCorrect] Using basic correction for paragraph');
            // Apply non-AI corrections immediately
            const newTr = tr.replaceWith(
              startOfParent, 
              endOfParent,
              state.schema.text(correctedText)
            );
            dispatch(newTr);
          }
        } else {
          // Correct selected text
          const selectedText = state.doc.textBetween(from, to, ' ', ' ');
          if (!selectedText || selectedText.trim().length === 0) return true;
          
          // Apply basic corrections
          const correctedText = applyBasicCorrections(selectedText, this.options, this.options.userDictionary);
          
          if (this.options.useAI && (window.isOpenRouterValid || !window.openRouterValidated)) {
            console.log('[SmartAutoCorrect] Using AI for selection correction');
            
            // Show loading indicator
            const coords = view.coordsAtPos(from);
            this.storage.showBubbleMenu(view, coords, 'loading', selectedText);
            
            // Use AI to improve the text
            debouncedAiCorrect(correctedText)
              .then(aiCorrectedText => {
                if (aiCorrectedText !== selectedText) {
                  console.log('[SmartAutoCorrect] AI correction applied to selection');
                  const newTr = state.tr.replaceWith(
                    from,
                    to,
                    state.schema.text(aiCorrectedText)
                  );
                  dispatch(newTr);
                  this.storage.hideBubbleMenu();
                } else {
                  console.log('[SmartAutoCorrect] AI correction returned unchanged selection');
                  // Show bubble menu for manual correction
                  const coords = view.coordsAtPos(from);
                  this.storage.showBubbleMenu(view, coords, 'unchanged', selectedText, from, to);
                }
              })
              .catch(error => {
                console.error('[SmartAutoCorrect] AI text correction error on selection:', error);
                this.storage.hideBubbleMenu();
                // Fallback to basic corrections if AI fails
                if (correctedText !== selectedText) {
                  const newTr = state.tr.replaceWith(
                    from,
                    to,
                    state.schema.text(correctedText)
                  );
                  dispatch(newTr);
                }
              });
          } else if (correctedText !== selectedText) {
            console.log('[SmartAutoCorrect] Using basic correction for selection');
            // Apply non-AI corrections immediately
            const newTr = tr.replaceWith(
              from,
              to,
              state.schema.text(correctedText)
            );
            dispatch(newTr);
          }
        }

        return true;
      },
      
      correctFullDocument: ({ editor }) => {
        if (!editor.isEditable) return false;
        
        console.log('[SmartAutoCorrect] Correcting full document...');
        
        const doc = editor.state.doc;
        const text = doc.textBetween(0, doc.content.size, ' ', ' ');
        
        if (!text || text.trim().length === 0) {
          console.log('[SmartAutoCorrect] Document is empty, nothing to correct');
          return false;
        }
        
        // Show a loading indicator
        const loadingNotification = document.createElement('div');
        loadingNotification.className = 'aie-full-document-loading';
        loadingNotification.innerHTML = `
          <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); z-index: 10000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); width: 400px; max-width: 90vw;">
              <div style="font-size: 16px; font-weight: 500; margin-bottom: 15px;">Correcting Document</div>
              <div style="margin-bottom: 20px;">Processing document with smart auto-correct...</div>
              <div style="height: 4px; background: #f0f0f0; border-radius: 2px; overflow: hidden;">
                <div class="progress-bar" style="height: 100%; width: 0%; background: var(--aie-toolbar-active-bg, #4a7bec); transition: width 0.3s;"></div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(loadingNotification);
        
        // Start progress animation
        const progressBar = loadingNotification.querySelector('.progress-bar') as HTMLElement;
        if (progressBar) {
          let progress = 0;
          const interval = setInterval(() => {
            progress += 1;
            if (progress > 95) {
              clearInterval(interval);
            }
            progressBar.style.width = `${progress}%`;
          }, 100);
        }
        
        // Use the SmartAutoCorrect instance to process the text
        const extension = this;
        
        // Process the text by chunks if it's very long
        const processText = async () => {
          let correctedText = text;
          
          // Apply basic corrections
          if (extension.options.capitalizeFirstLetter) {
            correctedText = extension.capitalizeFirstLetter(correctedText);
          }
          
          if (extension.options.fixCommonTypos) {
            correctedText = extension.correctTypos(correctedText);
          }
          
          if (extension.options.fixPunctuation) {
            correctedText = extension.fixPunctuation(correctedText);
          }
          
          if (extension.options.smartQuotes) {
            correctedText = extension.correctQuotes(correctedText);
          }
          
          // Apply AI corrections if enabled
          if (extension.options.useAI && window.isOpenRouterValid) {
            try {
              console.log('[SmartAutoCorrect] Processing full document with AI...');
              // Process without context initially
              const aiCorrectedText = await debouncedAiCorrect(correctedText);
              if (aiCorrectedText !== correctedText) {
                console.log('[SmartAutoCorrect] AI corrections applied to full document');
                correctedText = aiCorrectedText;
              }
            } catch (error) {
              console.error('[SmartAutoCorrect] Error in AI full document correction:', error);
            }
          }
          
          return correctedText;
        };
        
        // Process the document
        processText().then(correctedText => {
          // Remove the loading notification
          loadingNotification.remove();
          
          // If text was modified, show a confirmation dialog with options
          if (correctedText !== text) {
            // Show the correction confirmation UI
            const confirmDialog = document.createElement('div');
            confirmDialog.className = 'aie-full-document-confirm';
            confirmDialog.innerHTML = `
              <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); width: 500px; max-width: 90vw; max-height: 90vh; display: flex; flex-direction: column;">
                  <div style="font-size: 16px; font-weight: 500; margin-bottom: 15px;">Document Correction</div>
                  <div style="margin-bottom: 15px; overflow-y: auto; max-height: 50vh;">
                    <div style="font-weight: 500; margin-bottom: 10px;">The auto-correct found some improvements:</div>
                    <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px; white-space: pre-wrap;">
                      ${extension.storage.generateTextDiff(text, correctedText)}
                    </div>
                  </div>
                  <div style="display: flex; gap: 10px; margin-top: auto;">
                    <button class="apply-btn" style="flex: 1; padding: 8px; background: var(--aie-success-color, #4caf50); color: white; border: none; border-radius: 4px; cursor: pointer;">Apply Corrections</button>
                    <button class="edit-btn" style="padding: 8px; background: var(--aie-toolbar-active-bg, #4a7bec); color: white; border: none; border-radius: 4px; cursor: pointer;">Edit Manually</button>
                    <button class="cancel-btn" style="padding: 8px; background: #f0f0f0; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Cancel</button>
                  </div>
                </div>
              </div>
            `;
            document.body.appendChild(confirmDialog);
            
            // Add event listeners
            const applyBtn = confirmDialog.querySelector('.apply-btn');
            const editBtn = confirmDialog.querySelector('.edit-btn');
            const cancelBtn = confirmDialog.querySelector('.cancel-btn');
            
            applyBtn?.addEventListener('click', () => {
              // Apply the correction to the full document
              const tr = editor.state.tr;
              tr.replaceWith(0, doc.content.size, editor.state.schema.text(correctedText));
              editor.view.dispatch(tr);
              confirmDialog.remove();
            });
            
            editBtn?.addEventListener('click', () => {
              // Create a document with both versions to let the user edit
              const comparisonText = `Original Document:\n${text}\n\n---\n\nCorrected Document:\n${correctedText}`;
              
              // Create a temporary textarea to let the user edit
              const editDialog = document.createElement('div');
              editDialog.className = 'aie-full-document-edit';
              editDialog.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); z-index: 10001; display: flex; align-items: center; justify-content: center;">
                  <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); width: 80vw; max-width: 1000px; height: 80vh; display: flex; flex-direction: column;">
                    <div style="font-size: 16px; font-weight: 500; margin-bottom: 15px;">Edit Corrected Document</div>
                    <div style="flex: 1; overflow: hidden; margin-bottom: 15px;">
                      <textarea style="width: 100%; height: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; resize: none;">${correctedText}</textarea>
                    </div>
                    <div style="display: flex; gap: 10px;">
                      <button class="save-btn" style="flex: 1; padding: 8px; background: var(--aie-success-color, #4caf50); color: white; border: none; border-radius: 4px; cursor: pointer;">Save Changes</button>
                      <button class="cancel-edit-btn" style="padding: 8px; background: #f0f0f0; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Cancel</button>
                    </div>
                  </div>
                </div>
              `;
              document.body.appendChild(editDialog);
              
              // Focus the textarea
              const textarea = editDialog.querySelector('textarea');
              if (textarea) {
                textarea.focus();
              }
              
              // Add event listeners
              const saveBtn = editDialog.querySelector('.save-btn');
              const cancelEditBtn = editDialog.querySelector('.cancel-edit-btn');
              
              saveBtn?.addEventListener('click', () => {
                // Get the edited text from the textarea
                const editedText = (textarea as HTMLTextAreaElement).value;
                
                // Apply the edited text to the document
                const tr = editor.state.tr;
                tr.replaceWith(0, doc.content.size, editor.state.schema.text(editedText));
                editor.view.dispatch(tr);
                
                // Remove both dialogs
                editDialog.remove();
                confirmDialog.remove();
              });
              
              cancelEditBtn?.addEventListener('click', () => {
                // Just close the edit dialog
                editDialog.remove();
              });
            });
            
            cancelBtn?.addEventListener('click', () => {
              // Just close the dialog without making changes
              confirmDialog.remove();
            });
          } else {
            // No changes were made, show a message
            const noChangesDialog = document.createElement('div');
            noChangesDialog.className = 'aie-full-document-no-changes';
            noChangesDialog.innerHTML = `
              <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); width: 400px; max-width: 90vw;">
                  <div style="font-size: 16px; font-weight: 500; margin-bottom: 15px;">Document Correction</div>
                  <div style="margin-bottom: 20px;">No corrections needed. The document appears to be well-written!</div>
                  <div>
                    <label style="font-weight: 500; margin-bottom: 8px; display: block;">Add context to try again (optional):</label>
                    <textarea style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; height: 80px; margin-bottom: 10px;" placeholder="Add context about the document to help the AI understand what you're writing about..."></textarea>
                  </div>
                  <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="retry-btn" style="padding: 8px 16px; background: var(--aie-toolbar-active-bg, #4a7bec); color: white; border: none; border-radius: 4px; cursor: pointer;">Retry with Context</button>
                    <button class="close-btn" style="padding: 8px 16px; background: #f0f0f0; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Close</button>
                  </div>
                </div>
              </div>
            `;
            document.body.appendChild(noChangesDialog);
            
            // Add event listeners
            const retryBtn = noChangesDialog.querySelector('.retry-btn');
            const closeBtn = noChangesDialog.querySelector('.close-btn');
            const textarea = noChangesDialog.querySelector('textarea') as HTMLTextAreaElement;
            
            retryBtn?.addEventListener('click', () => {
              // Get the context from the textarea
              const context = textarea.value;
              
              // Only retry if context was provided
              if (context && context.trim()) {
                // Close the dialog
                noChangesDialog.remove();
                
                // Show loading again
                document.body.appendChild(loadingNotification);
                
                // Retry with context
                debouncedAiCorrect(text, false, context).then(contextCorrectedText => {
                  // Remove loading
                  loadingNotification.remove();
                  
                  // If we got changes this time, show the confirmation dialog
                  if (contextCorrectedText !== text) {
                    // Use the same confirmation dialog as before
                    const confirmDialog = document.createElement('div');
                    confirmDialog.className = 'aie-full-document-confirm';
                    confirmDialog.innerHTML = `
                      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); width: 500px; max-width: 90vw; max-height: 90vh; display: flex; flex-direction: column;">
                          <div style="font-size: 16px; font-weight: 500; margin-bottom: 15px;">Document Correction with Context</div>
                          <div style="margin-bottom: 15px; overflow-y: auto; max-height: 50vh;">
                            <div style="font-weight: 500; margin-bottom: 10px;">With the context you provided, the auto-correct found these improvements:</div>
                            <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px; white-space: pre-wrap;">
                              ${extension.storage.generateTextDiff(text, contextCorrectedText)}
                            </div>
                          </div>
                          <div style="display: flex; gap: 10px; margin-top: auto;">
                            <button class="apply-btn" style="flex: 1; padding: 8px; background: var(--aie-success-color, #4caf50); color: white; border: none; border-radius: 4px; cursor: pointer;">Apply Corrections</button>
                            <button class="edit-btn" style="padding: 8px; background: var(--aie-toolbar-active-bg, #4a7bec); color: white; border: none; border-radius: 4px; cursor: pointer;">Edit Manually</button>
                            <button class="cancel-btn" style="padding: 8px; background: #f0f0f0; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Cancel</button>
                          </div>
                        </div>
                      </div>
                    `;
                    document.body.appendChild(confirmDialog);
                    
                    // Add event listeners
                    const applyBtn = confirmDialog.querySelector('.apply-btn');
                    const editBtn = confirmDialog.querySelector('.edit-btn');
                    const cancelBtn = confirmDialog.querySelector('.cancel-btn');
                    
                    applyBtn?.addEventListener('click', () => {
                      // Apply the correction to the full document
                      const tr = editor.state.tr;
                      tr.replaceWith(0, doc.content.size, editor.state.schema.text(contextCorrectedText));
                      editor.view.dispatch(tr);
                      confirmDialog.remove();
                    });
                    
                    editBtn?.addEventListener('click', () => {
                      // Create a document with both versions to let the user edit
                      const comparisonText = `Original Document:\n${text}\n\n---\n\nCorrected Document:\n${contextCorrectedText}`;
                      
                      // Create a temporary textarea to let the user edit
                      const editDialog = document.createElement('div');
                      editDialog.className = 'aie-full-document-edit';
                      editDialog.innerHTML = `
                        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); z-index: 10001; display: flex; align-items: center; justify-content: center;">
                          <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); width: 80vw; max-width: 1000px; height: 80vh; display: flex; flex-direction: column;">
                            <div style="font-size: 16px; font-weight: 500; margin-bottom: 15px;">Edit Corrected Document</div>
                            <div style="flex: 1; overflow: hidden; margin-bottom: 15px;">
                              <textarea style="width: 100%; height: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; resize: none;">${contextCorrectedText}</textarea>
                            </div>
                            <div style="display: flex; gap: 10px;">
                              <button class="save-btn" style="flex: 1; padding: 8px; background: var(--aie-success-color, #4caf50); color: white; border: none; border-radius: 4px; cursor: pointer;">Save Changes</button>
                              <button class="cancel-edit-btn" style="padding: 8px; background: #f0f0f0; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Cancel</button>
                            </div>
                          </div>
                        </div>
                      `;
                      document.body.appendChild(editDialog);
                      
                      // Focus the textarea
                      const textarea = editDialog.querySelector('textarea');
                      if (textarea) {
                        textarea.focus();
                      }
                      
                      // Add event listeners
                      const saveBtn = editDialog.querySelector('.save-btn');
                      const cancelEditBtn = editDialog.querySelector('.cancel-edit-btn');
                      
                      saveBtn?.addEventListener('click', () => {
                        // Get the edited text from the textarea
                        const editedText = (textarea as HTMLTextAreaElement).value;
                        
                        // Apply the edited text to the document
                        const tr = editor.state.tr;
                        tr.replaceWith(0, doc.content.size, editor.state.schema.text(editedText));
                        editor.view.dispatch(tr);
                        
                        // Remove both dialogs
                        editDialog.remove();
                        confirmDialog.remove();
                      });
                      
                      cancelEditBtn?.addEventListener('click', () => {
                        // Just close the edit dialog
                        editDialog.remove();
                      });
                    });
                    
                    cancelBtn?.addEventListener('click', () => {
                      // Just close the dialog without making changes
                      confirmDialog.remove();
                    });
                  } else {
                    // Still no changes, show a message
                    const stillNoChangesDialog = document.createElement('div');
                    stillNoChangesDialog.className = 'aie-full-document-still-no-changes';
                    stillNoChangesDialog.innerHTML = `
                      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); width: 400px; max-width: 90vw;">
                          <div style="font-size: 16px; font-weight: 500; margin-bottom: 15px;">Document Correction</div>
                          <div style="margin-bottom: 20px;">Even with the additional context, the AI found no corrections to make. Your document appears to be well-written!</div>
                          <div style="display: flex; justify-content: flex-end;">
                            <button class="final-close-btn" style="padding: 8px 16px; background: #f0f0f0; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Close</button>
                          </div>
                        </div>
                      </div>
                    `;
                    document.body.appendChild(stillNoChangesDialog);
                    
                    // Add event listener
                    const finalCloseBtn = stillNoChangesDialog.querySelector('.final-close-btn');
                    finalCloseBtn?.addEventListener('click', () => {
                      stillNoChangesDialog.remove();
                    });
                  }
                }).catch(error => {
                  console.error('[SmartAutoCorrect] Error in AI context-based correction:', error);
                  // Remove loading
                  loadingNotification.remove();
                  
                  // Show error message
                  const errorDialog = document.createElement('div');
                  errorDialog.className = 'aie-full-document-error';
                  errorDialog.innerHTML = `
                    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                      <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); width: 400px; max-width: 90vw;">
                        <div style="font-size: 16px; font-weight: 500; margin-bottom: 15px; color: #f44336;">Error</div>
                        <div style="margin-bottom: 20px;">There was an error processing your document. Please try again later.</div>
                        <div style="display: flex; justify-content: flex-end;">
                          <button class="error-close-btn" style="padding: 8px 16px; background: #f0f0f0; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Close</button>
                        </div>
                      </div>
                    </div>
                  `;
                  document.body.appendChild(errorDialog);
                  
                  // Add event listener
                  const errorCloseBtn = errorDialog.querySelector('.error-close-btn');
                  errorCloseBtn?.addEventListener('click', () => {
                    errorDialog.remove();
                  });
                });
              }
            });
            
            closeBtn?.addEventListener('click', () => {
              // Just close the dialog
              noChangesDialog.remove();
            });
          }
        }).catch(error => {
          console.error('[SmartAutoCorrect] Error in full document correction:', error);
          
          // Remove the loading notification
          loadingNotification.remove();
          
          // Show error message
          const errorDialog = document.createElement('div');
          errorDialog.className = 'aie-full-document-error';
          errorDialog.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); z-index: 10000; display: flex; align-items: center; justify-content: center;">
              <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); width: 400px; max-width: 90vw;">
                <div style="font-size: 16px; font-weight: 500; margin-bottom: 15px; color: #f44336;">Error</div>
                <div style="margin-bottom: 20px;">There was an error processing your document. Please try again later.</div>
                <div style="display: flex; justify-content: flex-end;">
                  <button class="error-close-btn" style="padding: 8px 16px; background: #f0f0f0; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">Close</button>
                </div>
              </div>
            </div>
          `;
          document.body.appendChild(errorDialog);
          
          // Add event listener
          const errorCloseBtn = errorDialog.querySelector('.error-close-btn');
          errorCloseBtn?.addEventListener('click', () => {
            errorDialog.remove();
          });
        });
        
        return true;
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Alt-Shift-c': () => this.editor.commands.correctFullDocument(),
      'Alt-c': () => this.editor.commands.correctSelection(),
    };
  },

  addOptions() {
    return {
      enabled: true,
      capitalizeFirstLetter: true,
      fixCommonTypos: true,
      fixPunctuation: true,
      smartQuotes: true,
      useAI: true,
      aiDebounceTime: 2000,
      userDictionary: {},
    };
  },

  addProseMirrorPlugins() {
    const { 
      enabled, 
      capitalizeFirstLetter: capFirst, 
      fixCommonTypos, 
      fixPunctuation: fixPunct, 
      smartQuotes, 
      useAI,
      aiDebounceTime,
      userDictionary 
    } = this.options;
    
    if (!enabled) {
      return [];
    }

    // Validate OpenRouter configuration when AI is enabled
    if (useAI && !window.openRouterValidated) {
      console.log('[SmartAutoCorrect] Validating OpenRouter in plugin initialization');
      window.openRouterValidated = true;
      validateOpenRouterConfig().then(isValid => {
        window.isOpenRouterValid = isValid;
        if (!isValid) {
          console.warn('[SmartAutoCorrect] OpenRouter validation failed, will use basic corrections only');
        } else {
          console.log('[SmartAutoCorrect] OpenRouter validation successful, AI corrections enabled');
        }
      });
    }

    // Combine the default common typos with user-defined dictionary
    const typosMap = {
      ...commonTypos,
      ...userDictionary,
    };

    return [
      new Plugin({
        key: new PluginKey('smartAutoCorrect'),
        appendTransaction: (transactions, oldState, newState) => {
          // Skip if there are no changes or auto-correct is disabled
          if (!transactions.some(tr => tr.docChanged) || !enabled) return null;
          
          // Get the transaction
          const tr = newState.tr;
          let modified = false;
          
          // Track paragraphs to process with AI
          const paragraphs = new Map<string, { pos: number, text: string, length: number }>();
          
          // Handle word corrections after space or punctuation
          newState.doc.descendants((node, pos) => {
            if (node.isText) {
              const text = node.text as string;
              let newText = text;
              
              // Get the previous character
              const prevPos = pos - 1;
              const prevNode = prevPos >= 0 ? newState.doc.nodeAt(prevPos) : null;
              const prevChar = prevNode && prevNode.isText ? (prevNode.text as string).slice(-1) : '';
              
              // Only process if we have text
              if (text) {
                // Basic corrections
                // Split the text into words
                const words = text.split(/(\s+)/);
                let basicModified = false;
                
                for (let i = 0; i < words.length; i++) {
                  const word = words[i];
                  
                  // Skip spaces
                  if (word.match(/^\s+$/)) continue;
                  
                  // Check if the word is a common typo
                  if (fixCommonTypos && typosMap[word.toLowerCase()]) {
                    words[i] = typosMap[word.toLowerCase()];
                    basicModified = true;
                  }
                }
                
                if (basicModified) {
                  newText = words.join('');
                }
                
                // Apply smart quotes
                if (smartQuotes) {
                  const withSmartQuotes = applySmartQuotes(newText);
                  if (withSmartQuotes !== newText) {
                    newText = withSmartQuotes;
                    modified = true;
                  }
                }
                
                // Fix punctuation
                if (fixPunct) {
                  const withFixedPunctuation = fixPunctuation(newText);
                  if (withFixedPunctuation !== newText) {
                    newText = withFixedPunctuation;
                    modified = true;
                  }
                }
                
                // Capitalize first letter of sentences
                if (capFirst) {
                  const withCapitalizedFirst = capitalizeFirstLetter(newText);
                  if (withCapitalizedFirst !== newText) {
                    newText = withCapitalizedFirst;
                    modified = true;
                  }
                }
                
                // Apply basic changes if text was modified
                if (newText !== text) {
                  tr.replaceWith(pos, pos + text.length, newState.schema.text(newText));
                  modified = true;
                }
                
                // If AI is enabled and text has a decent length, track for AI processing
                if (useAI && (window.isOpenRouterValid || !window.openRouterValidated) && newText.length > 20) {
                  // Find the parent paragraph
                  let parentPos = pos;
                  let parent = newState.doc.resolve(parentPos).parent;
                  
                  while (parent && parent.type.name !== 'paragraph' && parent.type.name !== 'heading') {
                    parentPos = newState.doc.resolve(parentPos).before(1);
                    if (parentPos <= 0) break;
                    parent = newState.doc.resolve(parentPos).parent;
                  }
                  
                  if (parent && (parent.type.name === 'paragraph' || parent.type.name === 'heading')) {
                    const paragraphId = `${parentPos}:${parent.type.name}`;
                    
                    // Only process paragraphs that aren't already being processed
                    if (!processingParagraphs.has(paragraphId)) {
                      const paragraphText = parent.textContent;
                      
                      // Only process paragraphs with enough content
                      if (paragraphText.length > 30 && !paragraphs.has(paragraphId)) {
                        paragraphs.set(paragraphId, {
                          pos: parentPos,
                          text: paragraphText,
                          length: parent.nodeSize
                        });
                      }
                    }
                  }
                }
              }
            }
            
            return true;
          });
          
          // Process paragraphs with AI if there are any
          if (useAI && (window.isOpenRouterValid || !window.openRouterValidated) && paragraphs.size > 0) {
            console.log(`[SmartAutoCorrect] Processing ${paragraphs.size} paragraphs with AI`);
            for (const [paragraphId, { pos, text, length }] of paragraphs.entries()) {
              // Mark this paragraph as being processed
              processingParagraphs.add(paragraphId);
              
              // Use the debounced AI correction
              debouncedAiCorrect(text).then(correctedText => {
                if (correctedText !== text) {
                  console.log(`[SmartAutoCorrect] AI correction applied to paragraph: ${paragraphId}`);
                  // Create a new transaction to apply the AI corrections
                  const aiTr = this.editor.state.tr;
                  
                  // Verify the paragraph still exists and hasn't changed substantially
                  const currentNode = this.editor.state.doc.nodeAt(pos);
                  if (currentNode && (currentNode.type.name === 'paragraph' || currentNode.type.name === 'heading')) {
                    const currentText = currentNode.textContent;
                    
                    // Only apply if the paragraph hasn't changed too much
                    if (currentText.length > 0 && Math.abs(currentText.length - text.length) < 20) {
                      aiTr.replaceWith(pos, pos + currentNode.nodeSize, 
                        this.editor.schema.nodes[currentNode.type.name].create(
                          currentNode.attrs,
                          [this.editor.schema.text(correctedText)]
                        )
                      );
                      
                      // Apply the AI correction transaction
                      this.editor.view.dispatch(aiTr);
                    } else {
                      console.log(`[SmartAutoCorrect] Paragraph changed too much, skipping AI correction`);
                    }
                  } else {
                    console.log(`[SmartAutoCorrect] Paragraph no longer exists, skipping AI correction`);
                  }
                  
                  // Remove this paragraph from processing
                  processingParagraphs.delete(paragraphId);
                } else {
                  console.log(`[SmartAutoCorrect] AI correction returned unchanged text for paragraph: ${paragraphId}`);
                  processingParagraphs.delete(paragraphId);
                }
              }).catch(error => {
                console.error('[SmartAutoCorrect] AI correction error:', error);
                // Remove from processing even on error
                processingParagraphs.delete(paragraphId);
              });
            }
          } else if (useAI && !window.isOpenRouterValid && window.openRouterValidated && paragraphs.size > 0) {
            console.log('[SmartAutoCorrect] Skipping AI processing because OpenRouter validation failed');
          }
          
          return modified ? tr : null;
        }
      })
    ];
  },

  /**
   * Handles correction after the user input has stabilized
   * Uses AI auto-correct if configured
   */
  async handleAutoCorrection(transaction: Transaction) {
    if (!this.options.enabled || !this.editor.isEditable) return;
    
    const { doc, selection } = transaction;
    const { from, to } = selection;
    
    // Only correct if we have a valid text selection (not node selection)
    if (selection.empty || from === to) return;
    
    // Get the text from the current selection
    const text = doc.textBetween(from, to, ' ', ' ');
    if (!text || text.trim().length === 0) return;
    
    // Only process certain patterns like sentences or completed words
    const isParagraphEnd = text.endsWith('.') || text.endsWith('!') || text.endsWith('?');
    const isWordEnd = text.endsWith(' ') || isParagraphEnd;
    const isMultiLineText = text.includes('\n');
    
    // Only correct text when appropriate conditions are met
    if (!isWordEnd && !isMultiLineText && !this.isSelectionCorrection) return;
    
    console.log(`[SmartAutoCorrect] Processing text: "${text}"`);
    
    // Apply basic corrections first
    let correctedText = text;
    
    if (this.options.capitalizeFirstLetter) {
      correctedText = this.capitalizeFirstLetter(correctedText);
    }
    
    if (this.options.fixCommonTypos) {
      correctedText = this.correctTypos(correctedText);
    }
    
    if (this.options.fixPunctuation) {
      correctedText = this.fixPunctuation(correctedText);
    }
    
    if (this.options.smartQuotes) {
      correctedText = this.correctQuotes(correctedText);
    }
    
    // Apply AI corrections if enabled
    if (this.options.useAI && window.isOpenRouterValid) {
      try {
        console.log('[SmartAutoCorrect] Using AI for correction...');
        
        // Show loading state in the bubble menu if this is a manual correction
        if (this.isSelectionCorrection) {
          const coords = this.editor.view.coordsAtPos(from);
          this.storage.showBubbleMenu(this.editor.view, coords, 'loading', text);
        }
        
        const aiCorrectedText = await debouncedAiCorrect(correctedText);
        
        if (aiCorrectedText !== correctedText) {
          console.log(`[SmartAutoCorrect] AI corrected text: "${aiCorrectedText}"`);
          correctedText = aiCorrectedText;
        } else {
          console.log('[SmartAutoCorrect] AI returned unchanged text');
        }
        
        // Show correction confirmation UI
        if (this.isSelectionCorrection) {
          const coords = this.editor.view.coordsAtPos(from);
          
          // Always show the correction UI with options
          if (aiCorrectedText !== text) {
            // Show corrected version with options to apply/append/etc
            this.storage.showBubbleMenu(this.editor.view, coords, 'corrected', text, aiCorrectedText, from, to);
            return; // Don't auto-apply, let the user choose from the menu
          } else {
            // Show "no changes needed" with context option
            this.storage.showBubbleMenu(this.editor.view, coords, 'unchanged', text, undefined, from, to);
            return; // Let the user provide context or dismiss
          }
        }
      } catch (error) {
        console.error('[SmartAutoCorrect] AI correction error:', error);
      }
    }
    
    // Only automatically apply changes if text was actually modified
    // and this isn't a manual selection correction (which shows UI)
    if (correctedText !== text && !this.isSelectionCorrection) {
      // Apply the correction
      this.editor.view.dispatch(
        this.editor.view.state.tr.insertText(correctedText, from, to)
      );
      console.log(`[SmartAutoCorrect] Applied correction: "${correctedText}"`);
    } else if (this.isSelectionCorrection && !this.options.useAI) {
      // For manual corrections without AI, still show the UI
      const coords = this.editor.view.coordsAtPos(from);
      if (correctedText !== text) {
        this.storage.showBubbleMenu(this.editor.view, coords, 'corrected', text, correctedText, from, to);
      } else {
        this.storage.showBubbleMenu(this.editor.view, coords, 'unchanged', text, undefined, from, to);
      }
    }
    
    // Reset selection correction flag
    this.isSelectionCorrection = false;
  },
});
