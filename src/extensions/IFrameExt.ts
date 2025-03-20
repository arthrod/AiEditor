import { Node } from '@tiptap/core'

export interface IframeOptions {
    allowFullscreen: boolean,
    HTMLAttributes: {
        [key: string]: any
    },
    filePreview: {
        enabled: boolean,
        supportedTypes: string[],
        maxSize: number
    }
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        iframe: {
            setIframe: (options: { src: string }) => ReturnType,
            previewFile: (options: { file: File }) => ReturnType,
        }
    }
}

export const IFrameExt = Node.create<IframeOptions>({
    name: 'iframe',

    group: 'block',

    atom: true,

    addOptions() {
        return {
            allowFullscreen: true,
            HTMLAttributes: {
                class: 'iframe-wrapper',
            },
            filePreview: {
                enabled: true,
                supportedTypes: [
                    'application/pdf',
                    'image/',
                    'video/',
                    'audio/',
                    'text/html',
                    'text/plain'
                ],
                maxSize: 50 * 1024 * 1024 // 50MB
            }
        }
    },

    addAttributes() {
        return {
            src: {
                default: null,
            },
            width: {
                default: "100%",
            },
            height: {
                default: "400px",
            },
            frameborder: {
                default: 0,
            },
            allowfullscreen: {
                default: this.options.allowFullscreen,
                parseHTML: () => this.options.allowFullscreen,
            },
            'data-file-preview': {
                default: null,
            },
            title: {
                default: null,
            },
            sandbox: {
                default: 'allow-scripts allow-same-origin allow-popups allow-forms',
            }
        }
    },

    parseHTML() {
        return [{
            tag: 'iframe',
        }]
    },

    renderHTML({ HTMLAttributes }) {
        const title = HTMLAttributes.title ? 
            [`<div class="iframe-title">${HTMLAttributes.title}</div>`] : [];
        
        return ['div', this.options.HTMLAttributes, 
            ...title,
            ['iframe', {
                ...HTMLAttributes,
                title: undefined
            }]
        ]
    },

    addCommands() {
        return {
            setIframe: (options: { src: string }) => ({ tr, dispatch }) => {
                const { selection } = tr
                const node = this.type.create(options)

                if (dispatch) {
                    tr.replaceRangeWith(selection.from, selection.to, node)
                }
                return true
            },
            
            previewFile: (options: { file: File }) => ({ tr, dispatch, editor }) => {
                if (!this.options.filePreview.enabled) {
                    return false;
                }
                
                const { file } = options;
                
                if (file.size > this.options.filePreview.maxSize) {
                    console.error(`File too large for preview: ${file.size} bytes`);
                    return false;
                }
                
                const isSupported = this.options.filePreview.supportedTypes.some(type => {
                    if (type.endsWith('/')) {
                        return file.type.startsWith(type);
                    }
                    return file.type === type;
                });
                
                if (!isSupported) {
                    console.error(`Unsupported file type for preview: ${file.type}`);
                    return false;
                }
                
                const blobUrl = URL.createObjectURL(file);
                
                const attrs: any = {
                    src: blobUrl,
                    'data-file-preview': file.type,
                    title: file.name,
                };
                
                if (file.type.startsWith('image/')) {
                    attrs.src = blobUrl;
                    attrs.height = '300px';
                    attrs.sandbox = 'allow-same-origin';
                } else if (file.type.startsWith('video/')) {
                    const videoHtml = `
                        <html>
                        <head>
                            <title>${file.name}</title>
                            <style>
                                body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #000; }
                                video { max-width: 100%; max-height: 100%; }
                            </style>
                        </head>
                        <body>
                            <video controls src="${blobUrl}"></video>
                        </body>
                        </html>
                    `;
                    const videoBlob = new Blob([videoHtml], { type: 'text/html' });
                    const videoUrl = URL.createObjectURL(videoBlob);
                    attrs.src = videoUrl;
                    attrs.height = '400px';
                    attrs.sandbox = 'allow-scripts allow-same-origin';
                    
                    URL.revokeObjectURL(blobUrl);
                } else if (file.type.startsWith('audio/')) {
                    const audioHtml = `
                        <html>
                        <head>
                            <title>${file.name}</title>
                            <style>
                                body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; height: 100vh; }
                                audio { width: 100%; }
                                .title { margin-bottom: 10px; font-family: sans-serif; text-align: center; }
                            </style>
                        </head>
                        <body>
                            <div style="width: 100%;">
                                <div class="title">${file.name}</div>
                                <audio controls src="${blobUrl}"></audio>
                            </div>
                        </body>
                        </html>
                    `;
                    const audioBlob = new Blob([audioHtml], { type: 'text/html' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    attrs.src = audioUrl;
                    attrs.height = '120px';
                    attrs.sandbox = 'allow-scripts allow-same-origin';
                    
                    URL.revokeObjectURL(blobUrl);
                }
                
                const node = this.type.create(attrs);
                const { selection } = tr;
                
                if (dispatch) {
                    tr.replaceRangeWith(selection.from, selection.to, node);
                }
                
                editor?.on('destroy', () => {
                    if (attrs.src) {
                        URL.revokeObjectURL(attrs.src);
                    }
                });
                
                return true;
            }
        }
    },
    
    onDestroy() {
        // Unfortunately, we can't easily clean up individual blob URLs 
        // when nodes are removed from the document
        // Editor implementers should call URL.revokeObjectURL() for
        // blob URLs when appropriate
    }
})