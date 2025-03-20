import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface FileAPIOptions {
    // Maximum file size in bytes
    maxFileSize?: number;
    // Allowed file types
    allowedFileTypes?: string[];
    // Custom file processor function
    fileProcessor?: (file: File) => Promise<any>;
    // Events
    onFileRead?: (file: File, content: any) => void;
    onFileDownload?: (filename: string, content: any) => void;
    onError?: (error: Error) => void;
}

const fileAPIPluginKey = new PluginKey('file-api');

export const FileAPIExt = Extension.create<FileAPIOptions>({
    name: 'fileAPI',

    addOptions() {
        return {
            maxFileSize: 50 * 1024 * 1024, // 50MB default
            allowedFileTypes: ['*'], // All file types by default
            fileProcessor: async (file: File) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error('Failed to read file'));
                    
                    if (file.type.startsWith('text/') || 
                        file.type.includes('json') || 
                        file.name.endsWith('.md') || 
                        file.name.endsWith('.txt')) {
                        reader.readAsText(file);
                    } else if (file.type.startsWith('image/')) {
                        reader.readAsDataURL(file);
                    } else {
                        reader.readAsArrayBuffer(file);
                    }
                });
            }
        };
    },

    addCommands() {
        return {
            // Command to open file picker and read files
            openFilePicker: (options: { 
                accept?: string, 
                multiple?: boolean 
            }) => () => {
                return new Promise<boolean>((resolve) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = options.accept || '';
                    input.multiple = options.multiple || false;
                    
                    input.onchange = async (event) => {
                        const target = event.target as HTMLInputElement;
                        const files = target.files;
                        
                        if (!files || files.length === 0) {
                            resolve(false);
                            return;
                        }
                        
                        try {
                            for (let i = 0; i < files.length; i++) {
                                const file = files[i];
                                
                                // Check file size
                                if (file.size > this.options.maxFileSize) {
                                    throw new Error(`File ${file.name} exceeds maximum size of ${this.options.maxFileSize / (1024 * 1024)}MB`);
                                }
                                
                                // Check file type if not all types are allowed
                                if (this.options.allowedFileTypes[0] !== '*') {
                                    const fileExt = file.name.split('.').pop()?.toLowerCase();
                                    const fileType = file.type;
                                    const isAllowed = this.options.allowedFileTypes.some(type => 
                                        type.startsWith('.') ? `.${fileExt}` === type.toLowerCase() : fileType.includes(type)
                                    );
                                    
                                    if (!isAllowed) {
                                        throw new Error(`File type not allowed: ${file.type}`);
                                    }
                                }
                                
                                // Process file
                                const content = await this.options.fileProcessor(file);
                                
                                // Trigger callback
                                if (this.options.onFileRead) {
                                    this.options.onFileRead(file, content);
                                }
                            }
                            
                            resolve(true);
                        } catch (error) {
                            if (this.options.onError) {
                                this.options.onError(error as Error);
                            }
                            console.error('Error processing file:', error);
                            resolve(false);
                        }
                    };
                    
                    // Trigger file dialog
                    input.click();
                });
            },
            
            // Command to save content as a file
            saveAsFile: (options: { 
                filename: string, 
                content: string | ArrayBuffer | Blob, 
                mimeType?: string 
            }) => () => {
                try {
                    let blob: Blob;
                    
                    if (options.content instanceof Blob) {
                        blob = options.content;
                    } else if (options.content instanceof ArrayBuffer) {
                        blob = new Blob([options.content], { type: options.mimeType || 'application/octet-stream' });
                    } else {
                        blob = new Blob([options.content], { type: options.mimeType || 'text/plain' });
                    }
                    
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = options.filename;
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    
                    // Clean up
                    setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }, 100);
                    
                    if (this.options.onFileDownload) {
                        this.options.onFileDownload(options.filename, options.content);
                    }
                    
                    return true;
                } catch (error) {
                    if (this.options.onError) {
                        this.options.onError(error as Error);
                    }
                    console.error('Error saving file:', error);
                    return false;
                }
            }
        };
    },

    // Add utility functions to the extension
    addStorage() {
        return {
            // Convert file to data URL
            fileToDataURL: (file: File): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            },
            
            // Convert file to text
            fileToText: (file: File): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsText(file);
                });
            },
            
            // Convert file to array buffer
            fileToArrayBuffer: (file: File): Promise<ArrayBuffer> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as ArrayBuffer);
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(file);
                });
            },
            
            // Create a blob URL from content
            createBlobURL: (content: string | ArrayBuffer, mimeType: string = 'application/octet-stream'): string => {
                const blob = new Blob([content], { type: mimeType });
                return URL.createObjectURL(blob);
            },
            
            // Revoke a blob URL
            revokeBlobURL: (url: string): void => {
                URL.revokeObjectURL(url);
            }
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: fileAPIPluginKey
            }),
        ];
    },
}); 