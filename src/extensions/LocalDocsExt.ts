import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { AiEditor } from "../core/AiEditor";

export interface LocalDocument {
    id: string;
    title: string;
    content: any; // Document JSON content
    createdAt: number;
    updatedAt: number;
    tags?: string[];
    excerpt?: string;
}

export interface LocalDocsOptions {
    storagePrefix?: string;
    maxDocuments?: number;
    autoSaveInterval?: number; // in milliseconds, 0 for disable
    onDocumentSaved?: (doc: LocalDocument) => void;
    onDocumentLoaded?: (doc: LocalDocument) => void;
    onDocumentDeleted?: (docId: string) => void;
}

export const LOCAL_DOCS_KEY = 'aieditor-local-docs';
const localDocsPluginKey = new PluginKey('local-docs');

export class LocalDocsManager {
    private editor: AiEditor;
    private options: LocalDocsOptions;
    private autoSaveTimer: any = null;
    private currentDocId: string | null = null;

    constructor(editor: AiEditor, options: LocalDocsOptions) {
        this.editor = editor;
        this.options = options;
        
        // Initialize auto-save if enabled
        if (options.autoSaveInterval && options.autoSaveInterval > 0) {
            this.startAutoSave();
        }
    }

    /**
     * Start auto-save timer
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(() => {
            if (this.currentDocId && !this.editor.isEmpty()) {
                this.saveCurrentDocument();
            }
        }, this.options.autoSaveInterval);
    }

    /**
     * Stop auto-save timer
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    /**
     * Get all local documents
     */
    getAllDocuments(): LocalDocument[] {
        try {
            const storedDocs = localStorage.getItem(this.getStorageKey());
            if (storedDocs) {
                return JSON.parse(storedDocs);
            }
        } catch (error) {
            console.error('Error retrieving local documents:', error);
        }
        return [];
    }

    /**
     * Save the current editor content as a new document
     */
    createNewDocument(title: string, tags: string[] = []): LocalDocument | null {
        if (this.editor.isEmpty()) {
            return null;
        }

        const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const content = this.editor.getJson();
        const excerpt = this.generateExcerpt(this.editor.getText());
        
        const newDoc: LocalDocument = {
            id,
            title,
            content,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            tags,
            excerpt
        };

        const documents = this.getAllDocuments();
        
        // Check if we need to remove older documents
        if (this.options.maxDocuments && documents.length >= this.options.maxDocuments) {
            // Sort by updatedAt and remove oldest
            documents.sort((a, b) => b.updatedAt - a.updatedAt);
            documents.splice(this.options.maxDocuments - 1);
        }
        
        documents.unshift(newDoc);
        this.saveDocumentsList(documents);
        
        this.currentDocId = id;
        
        if (this.options.onDocumentSaved) {
            this.options.onDocumentSaved(newDoc);
        }
        
        return newDoc;
    }

    /**
     * Save changes to the current document
     */
    saveCurrentDocument(): LocalDocument | null {
        if (!this.currentDocId || this.editor.isEmpty()) {
            return null;
        }

        const documents = this.getAllDocuments();
        const docIndex = documents.findIndex(doc => doc.id === this.currentDocId);
        
        if (docIndex === -1) {
            return null;
        }
        
        const content = this.editor.getJson();
        const excerpt = this.generateExcerpt(this.editor.getText());
        
        documents[docIndex].content = content;
        documents[docIndex].updatedAt = Date.now();
        documents[docIndex].excerpt = excerpt;
        
        this.saveDocumentsList(documents);
        
        if (this.options.onDocumentSaved) {
            this.options.onDocumentSaved(documents[docIndex]);
        }
        
        return documents[docIndex];
    }

    /**
     * Load a document by ID
     */
    loadDocument(id: string): LocalDocument | null {
        const documents = this.getAllDocuments();
        const document = documents.find(doc => doc.id === id);
        
        if (!document) {
            return null;
        }
        
        // Update editor content
        this.editor.innerEditor.commands.setContent(document.content);
        this.currentDocId = id;
        
        // Move to front of list and update access time
        const docIndex = documents.findIndex(doc => doc.id === id);
        if (docIndex > 0) {
            const doc = documents.splice(docIndex, 1)[0];
            doc.updatedAt = Date.now(); // Update access time
            documents.unshift(doc);
            this.saveDocumentsList(documents);
        }
        
        if (this.options.onDocumentLoaded) {
            this.options.onDocumentLoaded(document);
        }
        
        return document;
    }

    /**
     * Delete a document by ID
     */
    deleteDocument(id: string): boolean {
        const documents = this.getAllDocuments();
        const docIndex = documents.findIndex(doc => doc.id === id);
        
        if (docIndex === -1) {
            return false;
        }
        
        documents.splice(docIndex, 1);
        this.saveDocumentsList(documents);
        
        if (id === this.currentDocId) {
            this.currentDocId = null;
        }
        
        if (this.options.onDocumentDeleted) {
            this.options.onDocumentDeleted(id);
        }
        
        return true;
    }

    /**
     * Update document metadata (title, tags)
     */
    updateDocumentMetadata(id: string, metadata: { title?: string, tags?: string[] }): LocalDocument | null {
        const documents = this.getAllDocuments();
        const docIndex = documents.findIndex(doc => doc.id === id);
        
        if (docIndex === -1) {
            return null;
        }
        
        if (metadata.title) {
            documents[docIndex].title = metadata.title;
        }
        
        if (metadata.tags) {
            documents[docIndex].tags = metadata.tags;
        }
        
        documents[docIndex].updatedAt = Date.now();
        this.saveDocumentsList(documents);
        
        return documents[docIndex];
    }

    /**
     * Export document as a file (JSON format)
     */
    exportDocument(id: string, format: 'json' | 'markdown' | 'text' = 'json'): string | null {
        const documents = this.getAllDocuments();
        const document = documents.find(doc => doc.id === id);
        
        if (!document) {
            return null;
        }
        
        if (format === 'json') {
            return JSON.stringify(document, null, 2);
        } else if (format === 'markdown' || format === 'text') {
            // Convert the document content to markdown or text
            try {
                // This assumes editor can convert JSON to markdown or text
                const contentJson = document.content;
                const contentText = this.convertContentToFormat(contentJson, format);
                
                return `# ${document.title}\n\n${contentText}`;
            } catch (error) {
                console.error('Error converting document to text:', error);
                return JSON.stringify(document, null, 2);
            }
        }
        
        return JSON.stringify(document, null, 2);
    }

    /**
     * Download document as a file
     */
    downloadDocument(id: string, format: 'json' | 'markdown' | 'text' = 'json'): boolean {
        const document = this.getAllDocuments().find(doc => doc.id === id);
        
        if (!document) {
            return false;
        }
        
        try {
            // Get document content in specified format
            const content = this.exportDocument(id, format);
            if (!content) return false;
            
            // Create file extension and MIME type based on format
            let fileExt = '.json';
            let mimeType = 'application/json';
            
            if (format === 'markdown') {
                fileExt = '.md';
                mimeType = 'text/markdown';
            } else if (format === 'text') {
                fileExt = '.txt';
                mimeType = 'text/plain';
            }
            
            // Create safe filename
            const safeTitle = document.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
            const filename = `${safeTitle}-${id.substring(0, 8)}${fileExt}`;
            
            // Create blob and download
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            return true;
        } catch (error) {
            console.error('Error downloading document:', error);
            return false;
        }
    }

    /**
     * Import document from a file
     */
    importDocumentFromFile(file: File): Promise<LocalDocument | null> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => {
                try {
                    const content = reader.result as string;
                    let doc: LocalDocument;
                    
                    if (file.name.endsWith('.json')) {
                        // Import JSON document
                        doc = JSON.parse(content) as LocalDocument;
                        
                        // Validate document structure
                        if (!doc.id || !doc.title || !doc.content) {
                            throw new Error('Invalid document format');
                        }
                    } else if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
                        // Import markdown or text as new document
                        const title = file.name.split('.').slice(0, -1).join('.');
                        
                        // Create content structure based on the text content
                        const editorContent = this.convertTextToEditorContent(content);
                        
                        // Generate a new document
                        doc = {
                            id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                            title: title,
                            content: editorContent,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                            excerpt: this.generateExcerpt(content)
                        };
                    } else {
                        throw new Error('Unsupported file format');
                    }
                    
                    // Add to documents list with a new ID to avoid conflicts
                    const originalId = doc.id;
                    doc.id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                    
                    // Update timestamps
                    const now = Date.now();
                    doc.updatedAt = now;
                    
                    // Add to documents list
                    const documents = this.getAllDocuments();
                    documents.unshift(doc);
                    this.saveDocumentsList(documents);
                    
                    resolve(doc);
                } catch (error) {
                    console.error('Error importing document:', error);
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    /**
     * Convert document content JSON to text or markdown format
     * This is a simplified implementation - you may need to implement
     * a more sophisticated converter based on your document structure
     */
    private convertContentToFormat(contentJson: any, format: 'markdown' | 'text'): string {
        try {
            // If the editor instance is available, use it for conversion
            if (this.editor && this.editor.innerEditor) {
                // Set the content to the editor
                const tempEditor = this.editor.innerEditor;
                const currentContent = tempEditor.getJSON();
                
                // Set the content we want to convert
                tempEditor.commands.setContent(contentJson);
                
                // Get the converted content
                let result = '';
                if (format === 'markdown') {
                    result = tempEditor.storage.markdown?.getMarkdown() || tempEditor.getText();
                } else {
                    result = tempEditor.getText();
                }
                
                // Restore the original content
                tempEditor.commands.setContent(currentContent);
                
                return result;
            }
            
            // Fallback: simple text extraction
            if (contentJson.content) {
                // Extract text from paragraphs recursively
                return this.extractTextFromContent(contentJson);
            }
            
            return JSON.stringify(contentJson);
        } catch (error) {
            console.error('Error converting content:', error);
            return JSON.stringify(contentJson);
        }
    }

    /**
     * Recursively extract text from document content
     */
    private extractTextFromContent(node: any): string {
        if (!node) return '';
        
        if (typeof node === 'string') return node;
        
        if (Array.isArray(node)) {
            return node.map(item => this.extractTextFromContent(item)).join('\n');
        }
        
        if (node.text) return node.text;
        
        if (node.content) {
            return this.extractTextFromContent(node.content);
        }
        
        return '';
    }

    /**
     * Convert plain text/markdown to editor content structure
     */
    private convertTextToEditorContent(text: string): any {
        // Create a simple document structure with paragraphs
        const paragraphs = text.split(/\n\s*\n/);
        
        const content = paragraphs.map(paragraph => {
            // Skip empty paragraphs
            if (!paragraph.trim()) return null;
            
            // Check if it's a heading
            if (paragraph.trim().startsWith('# ')) {
                return {
                    type: 'heading',
                    attrs: { level: 1 },
                    content: [{ type: 'text', text: paragraph.trim().substring(2) }]
                };
            } else if (paragraph.trim().startsWith('## ')) {
                return {
                    type: 'heading',
                    attrs: { level: 2 },
                    content: [{ type: 'text', text: paragraph.trim().substring(3) }]
                };
            } else if (paragraph.trim().startsWith('### ')) {
                return {
                    type: 'heading',
                    attrs: { level: 3 },
                    content: [{ type: 'text', text: paragraph.trim().substring(4) }]
                };
            }
            
            // Regular paragraph
            return {
                type: 'paragraph',
                content: [{ type: 'text', text: paragraph.trim() }]
            };
        }).filter(p => p !== null);
        
        return {
            type: 'doc',
            content: content
        };
    }

    /**
     * Get the current document ID
     */
    getCurrentDocId(): string | null {
        return this.currentDocId;
    }

    /**
     * Get the storage key with prefix
     */
    private getStorageKey(): string {
        return `${this.options.storagePrefix || 'aieditor'}-${LOCAL_DOCS_KEY}`;
    }

    /**
     * Save the documents list to localStorage
     */
    private saveDocumentsList(documents: LocalDocument[]): void {
        try {
            localStorage.setItem(this.getStorageKey(), JSON.stringify(documents));
        } catch (error) {
            console.error('Error saving documents to localStorage:', error);
        }
    }

    /**
     * Generate a brief excerpt from document text
     */
    private generateExcerpt(text: string, maxLength: number = 150): string {
        if (!text || text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength).trim() + '...';
    }

    /**
     * Clean up when extension is destroyed
     */
    destroy() {
        this.stopAutoSave();
    }
}

export const LocalDocsExt = Extension.create<LocalDocsOptions>({
    name: 'localDocs',

    addOptions() {
        return {
            storagePrefix: 'aieditor',
            maxDocuments: 100,
            autoSaveInterval: 30000, // 30 seconds
        };
    },

    addStorage() {
        return {
            manager: null as null | LocalDocsManager,
        };
    },

    onBeforeCreate() {
        // We'll initialize the manager after the editor is fully created
    },

    onCreate() {
        // Initialize the manager after the editor is created
        const editor = this.editor as unknown as AiEditor;
        this.storage.manager = new LocalDocsManager(editor, this.options);
    },

    onDestroy() {
        if (this.storage.manager) {
            this.storage.manager.destroy();
        }
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: localDocsPluginKey,
            }),
        ];
    },
}); 