import { EditorEvents } from "@tiptap/core";
import i18next from "i18next";
import { AiEditor } from "../../core/AiEditor.ts";
import { LocalDocsManager, LocalDocument } from "../../extensions/LocalDocsExt.ts";
import { AbstractDropdownMenuButton } from "../AbstractDropdownMenuButton.ts";

export class LocalDocsMenu extends AbstractDropdownMenuButton {
    editor: AiEditor;
    private manager: LocalDocsManager | null = null;
    private searchInput: HTMLInputElement | null = null;
    private documentListEl: HTMLDivElement | null = null;
    private emptyStateEl: HTMLDivElement | null = null;
    private currentDocTitle: HTMLInputElement | null = null;
    
    constructor(editor: AiEditor) {
        super(editor, {
            icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                   <path d="M19 5V19H5V5H19ZM21 5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5ZM7 7H17V9H7V7ZM7 11H17V13H7V11ZM7 15H13V17H7V15Z"></path>
                   </svg>`,
            tipPosition: 'bottom-right',
            noBorder: true
        });
        
        this.editor = editor;
        
        // Try to get access to the LocalDocsManager, but with safety checks
        if (editor && editor.innerEditor && editor.innerEditor.extensionManager) {
            const localDocsExt = editor.innerEditor.extensionManager.extensions.find(ext => ext.name === 'localDocs');
            if (localDocsExt && localDocsExt.storage) {
                this.manager = localDocsExt.storage.manager;
            }
        }
        
        // Initialize the dropdown content
        this.initializeDropdownContent();
    }
    
    /**
     * Override the renderTemplate method to correctly render the dropdown button
     */
    renderTemplate() {
        const docIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 5V19H5V5H19ZM21 5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5ZM7 7H17V9H7V7ZM7 11H17V13H7V11ZM7 15H13V17H7V15Z"></path>
        </svg>`;
        
        this.template = `
        <div>
            <div style="display: flex; align-items: center; padding: 0 8px;" id="tippy">
                <span style="display: flex; text-align: center; overflow: hidden;" id="text">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        ${docIcon}
                        <span>${i18next.t('localDocs.buttonText')}</span>
                    </div>
                </span>
                <div style="display: flex; justify-content: center; align-items: center;">
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
     * Initialize the dropdown content with search, document list, and actions
     */
    private initializeDropdownContent() {
        try {
            // Create the main container for the dropdown
            const container = document.createElement('div');
            container.className = 'aie-local-docs-container';
            container.style.padding = '10px';
            container.style.width = '320px';
            container.style.maxHeight = '400px';
            container.style.overflow = 'hidden';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            
            // Create header with search and actions
            const headerEl = document.createElement('div');
            headerEl.className = 'aie-local-docs-header';
            headerEl.style.marginBottom = '10px';
            headerEl.style.display = 'flex';
            headerEl.style.flexDirection = 'column';
            headerEl.style.gap = '10px';
            
            // Search field
            const searchContainer = document.createElement('div');
            searchContainer.className = 'aie-local-docs-search';
            searchContainer.style.display = 'flex';
            searchContainer.style.position = 'relative';
            
            this.searchInput = document.createElement('input');
            this.searchInput.type = 'text';
            this.searchInput.placeholder = i18next.t('localDocs.searchPlaceholder');
            this.searchInput.className = 'aie-local-docs-search-input';
            this.searchInput.style.width = '100%';
            this.searchInput.style.padding = '6px 30px 6px 8px';
            this.searchInput.style.borderRadius = '4px';
            this.searchInput.style.border = '1px solid #ddd';
            this.searchInput.style.fontSize = '14px';
            
            const searchIconEl = document.createElement('div');
            searchIconEl.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M18.031 16.6168L22.3137 20.8995L20.8995 22.3137L16.6168 18.031C15.0769 19.263 13.124 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2C15.968 2 20 6.032 20 11C20 13.124 19.263 15.0769 18.031 16.6168ZM16.0247 15.8748C17.2475 14.6146 18 12.8956 18 11C18 7.1325 14.8675 4 11 4C7.1325 4 4 7.1325 4 11C4 14.8675 7.1325 18 11 18C12.8956 18 14.6146 17.2475 15.8748 16.0247L16.0247 15.8748Z"></path>
                </svg>
            `;
            searchIconEl.style.position = 'absolute';
            searchIconEl.style.right = '8px';
            searchIconEl.style.top = '50%';
            searchIconEl.style.transform = 'translateY(-50%)';
            searchIconEl.style.color = '#666';
            
            searchContainer.appendChild(this.searchInput);
            searchContainer.appendChild(searchIconEl);
            
            // Current document title
            const currentDocContainer = document.createElement('div');
            currentDocContainer.style.display = 'flex';
            currentDocContainer.style.alignItems = 'center';
            currentDocContainer.style.gap = '6px';
            
            this.currentDocTitle = document.createElement('input');
            this.currentDocTitle.type = 'text';
            this.currentDocTitle.placeholder = i18next.t('localDocs.documentTitle');
            this.currentDocTitle.className = 'aie-local-docs-title-input';
            this.currentDocTitle.style.flex = '1';
            this.currentDocTitle.style.padding = '6px 8px';
            this.currentDocTitle.style.borderRadius = '4px';
            this.currentDocTitle.style.border = '1px solid #ddd';
            this.currentDocTitle.style.fontSize = '14px';
            
            const saveButton = document.createElement('button');
            saveButton.textContent = i18next.t('localDocs.saveButton');
            saveButton.className = 'aie-local-docs-save-btn';
            saveButton.style.padding = '6px 12px';
            saveButton.style.background = '#4a8af4';
            saveButton.style.color = '#fff';
            saveButton.style.border = 'none';
            saveButton.style.borderRadius = '4px';
            saveButton.style.cursor = 'pointer';
            saveButton.style.fontSize = '14px';
            
            saveButton.addEventListener('click', () => this.saveDocument());
            
            currentDocContainer.appendChild(this.currentDocTitle);
            currentDocContainer.appendChild(saveButton);
            
            // Action buttons
            const actionContainer = document.createElement('div');
            actionContainer.className = 'aie-local-docs-actions';
            actionContainer.style.display = 'flex';
            actionContainer.style.gap = '8px';
            actionContainer.style.marginTop = '5px';
            
            const newDocButton = document.createElement('button');
            newDocButton.textContent = i18next.t('localDocs.newButton');
            newDocButton.className = 'aie-local-docs-new-btn';
            newDocButton.style.flex = '1';
            newDocButton.style.padding = '6px 12px';
            newDocButton.style.background = '#fff';
            newDocButton.style.border = '1px solid #ddd';
            newDocButton.style.borderRadius = '4px';
            newDocButton.style.cursor = 'pointer';
            newDocButton.style.fontSize = '14px';
            
            const importButton = document.createElement('button');
            importButton.textContent = i18next.t('localDocs.importButton');
            importButton.className = 'aie-local-docs-import-btn';
            importButton.style.flex = '1';
            importButton.style.padding = '6px 12px';
            importButton.style.background = '#fff';
            importButton.style.border = '1px solid #ddd';
            importButton.style.borderRadius = '4px';
            importButton.style.cursor = 'pointer';
            importButton.style.fontSize = '14px';
            
            newDocButton.addEventListener('click', () => this.newDocument());
            importButton.addEventListener('click', () => this.importDocument());
            
            actionContainer.appendChild(newDocButton);
            actionContainer.appendChild(importButton);
            
            headerEl.appendChild(searchContainer);
            headerEl.appendChild(currentDocContainer);
            headerEl.appendChild(actionContainer);
            
            // Create document list container
            const listContainer = document.createElement('div');
            listContainer.className = 'aie-local-docs-list-container';
            listContainer.style.flex = '1';
            listContainer.style.overflowY = 'auto';
            listContainer.style.marginTop = '10px';
            listContainer.style.paddingRight = '5px';
            listContainer.style.maxHeight = '300px';
            
            // Document list
            this.documentListEl = document.createElement('div');
            this.documentListEl.className = 'aie-local-docs-list';
            this.documentListEl.style.display = 'flex';
            this.documentListEl.style.flexDirection = 'column';
            this.documentListEl.style.gap = '8px';
            
            // Empty state message
            this.emptyStateEl = document.createElement('div');
            this.emptyStateEl.className = 'aie-local-docs-empty';
            this.emptyStateEl.textContent = i18next.t('localDocs.emptyState');
            this.emptyStateEl.style.textAlign = 'center';
            this.emptyStateEl.style.padding = '20px 0';
            this.emptyStateEl.style.color = '#666';
            this.emptyStateEl.style.fontStyle = 'italic';
            
            listContainer.appendChild(this.documentListEl);
            listContainer.appendChild(this.emptyStateEl);
            
            container.appendChild(headerEl);
            container.appendChild(listContainer);
            
            // Set up event listeners
            if (this.searchInput) {
                this.searchInput.addEventListener('input', () => this.handleSearch());
            }
            
            if (this.setDropdownContent) {
                this.setDropdownContent(container);
            }
        } catch (error) {
            console.error('Error initializing LocalDocsMenu dropdown content:', error);
        }
    }
    
    /**
     * Attempt to connect to the manager when the editor is ready
     * This can be called after initialization if the manager wasn't available initially
     */
    connectToManager() {
        if (!this.manager && this.editor && this.editor.innerEditor) {
            try {
                const localDocsExt = this.editor.innerEditor.extensionManager.extensions.find(ext => ext.name === 'localDocs');
                if (localDocsExt && localDocsExt.storage) {
                    this.manager = localDocsExt.storage.manager;
                    return true;
                }
            } catch (error) {
                console.error('Error connecting to LocalDocsManager:', error);
            }
        }
        return false;
    }
    
    /**
     * When the dropdown is opened, refresh the document list
     */
    protected onDropdownOpen() {
        // Try to connect to manager if not connected yet
        if (!this.manager) {
            this.connectToManager();
        }
        
        // Only proceed if we have a manager
        if (this.manager) {
            this.refreshDocumentList();
            this.updateCurrentDocumentTitle();
        } else {
            // Show a message if we can't connect to the manager
            if (this.documentListEl) {
                this.documentListEl.style.display = 'none';
            }
            
            if (this.emptyStateEl) {
                this.emptyStateEl.textContent = i18next.t('localDocs.connectionError') || 'Could not connect to document storage';
                this.emptyStateEl.style.display = 'block';
            }
        }
    }
    
    /**
     * Refresh the document list based on search input
     */
    private handleSearch() {
        if (!this.searchInput || !this.manager) return;
        
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        this.refreshDocumentList(searchTerm);
    }
    
    /**
     * Refresh the document list with optional filtering
     */
    private refreshDocumentList(searchTerm: string = '') {
        if (!this.documentListEl || !this.emptyStateEl) {
            return;
        }
        
        // Try to connect to manager if not connected yet
        if (!this.manager) {
            const connected = this.connectToManager();
            if (!connected) {
                // Show error message
                this.documentListEl.style.display = 'none';
                this.emptyStateEl.textContent = i18next.t('localDocs.connectionError') || 'Could not connect to document storage';
                this.emptyStateEl.style.display = 'block';
                return;
            }
        }
        
        // Clear current list
        this.documentListEl.innerHTML = '';
        
        try {
            // Get all documents
            const documents = this.manager?.getAllDocuments() || [];
            
            // Filter if search term is provided
            const filteredDocs = searchTerm 
                ? documents.filter(doc => 
                    doc.title.toLowerCase().includes(searchTerm) ||
                    (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchTerm))) ||
                    (doc.excerpt && doc.excerpt.toLowerCase().includes(searchTerm))
                )
                : documents;
            
            // Show empty state if no documents
            if (filteredDocs.length === 0) {
                this.documentListEl.style.display = 'none';
                this.emptyStateEl.style.display = 'block';
                return;
            }
            
            // Hide empty state and display documents
            this.documentListEl.style.display = 'flex';
            this.emptyStateEl.style.display = 'none';
            
            // Current document ID
            const currentDocId = this.manager?.getCurrentDocId() || null;
            
            // Create and append document items
            filteredDocs.forEach(doc => {
                const docItem = this.createDocumentListItem(doc, doc.id === currentDocId);
                this.documentListEl?.appendChild(docItem);
            });
        } catch (error) {
            console.error('Error refreshing document list:', error);
            this.documentListEl.style.display = 'none';
            this.emptyStateEl.textContent = i18next.t('localDocs.loadError') || 'Error loading documents';
            this.emptyStateEl.style.display = 'block';
        }
    }
    
    /**
     * Create a document list item element
     */
    private createDocumentListItem(doc: LocalDocument, isActive: boolean): HTMLElement {
        const docEl = document.createElement('div');
        docEl.className = `aie-local-docs-item ${isActive ? 'aie-local-docs-item-active' : ''}`;
        docEl.dataset.docId = doc.id;
        docEl.style.padding = '8px 10px';
        docEl.style.borderRadius = '4px';
        docEl.style.border = '1px solid #eee';
        docEl.style.cursor = 'pointer';
        docEl.style.position = 'relative';
        docEl.style.background = isActive ? '#f0f7ff' : '#fff';
        
        // Add hover effect
        docEl.addEventListener('mouseenter', () => {
            docEl.style.background = isActive ? '#e5f1ff' : '#f9f9f9';
        });
        
        docEl.addEventListener('mouseleave', () => {
            docEl.style.background = isActive ? '#f0f7ff' : '#fff';
        });
        
        // Title and date
        const headerEl = document.createElement('div');
        headerEl.style.display = 'flex';
        headerEl.style.justifyContent = 'space-between';
        headerEl.style.alignItems = 'center';
        headerEl.style.marginBottom = '5px';
        
        const titleEl = document.createElement('div');
        titleEl.className = 'aie-local-docs-item-title';
        titleEl.textContent = doc.title || i18next.t('localDocs.untitled');
        titleEl.style.fontWeight = 'bold';
        titleEl.style.fontSize = '14px';
        titleEl.style.overflow = 'hidden';
        titleEl.style.textOverflow = 'ellipsis';
        titleEl.style.whiteSpace = 'nowrap';
        titleEl.style.maxWidth = '200px';
        
        const dateEl = document.createElement('div');
        dateEl.className = 'aie-local-docs-item-date';
        dateEl.textContent = new Date(doc.updatedAt).toLocaleDateString();
        dateEl.style.fontSize = '12px';
        dateEl.style.color = '#888';
        
        headerEl.appendChild(titleEl);
        headerEl.appendChild(dateEl);
        
        // Excerpt
        const excerptEl = document.createElement('div');
        excerptEl.className = 'aie-local-docs-item-excerpt';
        excerptEl.textContent = doc.excerpt || '';
        excerptEl.style.fontSize = '13px';
        excerptEl.style.color = '#666';
        excerptEl.style.overflow = 'hidden';
        excerptEl.style.textOverflow = 'ellipsis';
        excerptEl.style.display = '-webkit-box';
        excerptEl.style.webkitLineClamp = '2';
        excerptEl.style.webkitBoxOrient = 'vertical';
        excerptEl.style.lineHeight = '1.3';
        
        // Actions
        const actionsEl = document.createElement('div');
        actionsEl.className = 'aie-local-docs-item-actions';
        actionsEl.style.display = 'flex';
        actionsEl.style.gap = '8px';
        actionsEl.style.marginTop = '5px';
        actionsEl.style.justifyContent = 'flex-end';
        
        // Export button
        const exportBtn = document.createElement('button');
        exportBtn.title = i18next.t('localDocs.exportButton');
        exportBtn.className = 'aie-local-docs-export-btn';
        exportBtn.style.background = 'transparent';
        exportBtn.style.border = 'none';
        exportBtn.style.padding = '3px';
        exportBtn.style.cursor = 'pointer';
        exportBtn.style.color = '#666';
        exportBtn.style.borderRadius = '3px';
        exportBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M13 10H18L12 16L6 10H11V3H13V10ZM4 19H20V12H22V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V12H4V19Z"></path>
            </svg>
        `;
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.title = i18next.t('localDocs.deleteButton');
        deleteBtn.className = 'aie-local-docs-delete-btn';
        deleteBtn.style.background = 'transparent';
        deleteBtn.style.border = 'none';
        deleteBtn.style.padding = '3px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.color = '#666';
        deleteBtn.style.borderRadius = '3px';
        deleteBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 11H11V17H9V11ZM13 11H15V17H13V11ZM9 4V6H15V4H9Z"></path>
            </svg>
        `;
        
        actionsEl.appendChild(exportBtn);
        actionsEl.appendChild(deleteBtn);
        
        // Add event listeners
        docEl.addEventListener('click', (e) => {
            if (e.target !== exportBtn && e.target !== deleteBtn && 
                !exportBtn.contains(e.target as Node) && !deleteBtn.contains(e.target as Node)) {
                this.loadDocument(doc.id);
            }
        });
        
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.exportDocument(doc.id);
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteDocument(doc.id);
        });
        
        // Assemble the document item
        docEl.appendChild(headerEl);
        docEl.appendChild(excerptEl);
        docEl.appendChild(actionsEl);
        
        return docEl;
    }
    
    /**
     * Update the current document title input
     */
    private updateCurrentDocumentTitle() {
        if (!this.currentDocTitle || !this.manager) return;
        
        const currentDocId = this.manager.getCurrentDocId();
        if (!currentDocId) {
            this.currentDocTitle.value = '';
            return;
        }
        
        const docs = this.manager.getAllDocuments();
        const currentDoc = docs.find(doc => doc.id === currentDocId);
        
        if (currentDoc) {
            this.currentDocTitle.value = currentDoc.title;
        }
    }
    
    /**
     * Save the current document (create new or update existing)
     */
    private saveDocument() {
        if (!this.manager || !this.currentDocTitle) return;
        
        const title = this.currentDocTitle.value.trim() || i18next.t('localDocs.untitled');
        const currentDocId = this.manager.getCurrentDocId();
        
        if (currentDocId) {
            // Update existing document
            this.manager.updateDocumentMetadata(currentDocId, { title });
            this.manager.saveCurrentDocument();
        } else {
            // Create new document
            this.manager.createNewDocument(title);
        }
        
        this.refreshDocumentList();
        this.hideDropdown();
    }
    
    /**
     * Create a new empty document
     */
    private newDocument() {
        if (!this.editor || !this.currentDocTitle) return;
        
        // Clear editor content
        this.editor.clear();
        
        // Reset document ID
        if (this.manager) {
            this.manager.loadDocument(''); // This will reset the current document ID
        }
        
        // Set focus to title input
        this.currentDocTitle.value = '';
        this.currentDocTitle.focus();
    }
    
    /**
     * Load a document
     */
    private loadDocument(id: string) {
        if (!this.manager) return;
        
        this.manager.loadDocument(id);
        this.refreshDocumentList();
        this.updateCurrentDocumentTitle();
        this.hideDropdown();
    }
    
    /**
     * Delete a document
     */
    private deleteDocument(id: string) {
        if (!this.manager) return;
        
        if (confirm(i18next.t('localDocs.deleteConfirm'))) {
            this.manager.deleteDocument(id);
            this.refreshDocumentList();
            this.updateCurrentDocumentTitle();
        }
    }
    
    /**
     * Export a document
     */
    private exportDocument(id: string) {
        if (!this.manager) return;
        
        const docStr = this.manager.exportDocument(id);
        if (!docStr) return;
        
        // Get the document title for filename
        const docs = this.manager.getAllDocuments();
        const doc = docs.find(d => d.id === id);
        const title = doc ? doc.title : 'document';
        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        // Create a blob and download link
        const blob = new Blob([docStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeTitle}_${id.split('_')[1]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Import a document
     */
    private importDocument() {
        if (!this.manager) return;
        
        // Create a file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const content = reader.result as string;
                    const doc = this.manager?.importDocument(content);
                    
                    if (doc) {
                        // Load the imported document
                        this.manager?.loadDocument(doc.id);
                        this.refreshDocumentList();
                        this.updateCurrentDocumentTitle();
                        this.hideDropdown();
                    } else {
                        alert(i18next.t('localDocs.importError'));
                    }
                } catch (error) {
                    console.error('Error importing document:', error);
                    alert(i18next.t('localDocs.importError'));
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    /**
     * Handle transactions from the editor
     */
    onTransaction(event: EditorEvents["transaction"]): void {
        // If we need to react to specific transaction events, handle them here
        // For now, this is just a stub to satisfy the interface requirement
    }

    /**
     * Implementation of required abstract methods from AbstractDropdownMenuButton
     */
    onMenuTextRender(index: number): Element | string {
        // Since we're now using renderTemplate, this doesn't need to return anything
        return "";
    }

    onDropdownItemRender(index: number): Element | string {
        // Not using standard dropdown items, so return empty string
        return "";
    }

    onDropdownItemClick(index: number): void {
        // Not using standard dropdown items, no action needed
    }

    onDropdownActive(editor: any, index: number): boolean {
        // Not using standard dropdown active state
        return false;
    }

    /**
     * Handle editable state changes
     */
    onEditableChange(editable: boolean) {
        // First check if buttonElement is defined
        if (this.buttonElement) {
            // We can disable the menu when the editor is not editable
            this.buttonElement.disabled = !editable;
        } else {
            // Fall back to the parent class implementation if buttonElement is not available
            super.onEditableChange(editable);
        }
    }
} 