import {
    ChainedCommands,
    EditorEvents,
    EditorOptions,
    Extensions,
    getTextBetween,
    SingleCommands,
    Editor as Tiptap
} from "@tiptap/core";

import { Footer } from "../components/Footer.ts";
import { Header } from "../components/Header.ts";

import { getExtensions } from "./getExtensions.ts";

import "../styles";
// i18n
import i18next, { Resource } from "i18next";
import { de } from "../i18n/de.ts";
import { en } from "../i18n/en.ts";
import { es } from "../i18n/es.ts";
import { hi } from "../i18n/hi.ts";
import { id } from "../i18n/id.ts";
import { ja } from "../i18n/ja.ts";
import { ko } from "../i18n/ko.ts";
import { pt } from "../i18n/pt.ts";
import { th } from "../i18n/th.ts";
import { vi } from "../i18n/vi.ts";
import { zh } from "../i18n/zh.ts";

import { DOMParser } from "@tiptap/pm/model";
import { Transaction } from "@tiptap/pm/state";
import { AiGlobalConfig } from "../ai/AiGlobalConfig.ts";
import { AiModelManager } from "../ai/AiModelManager.ts";
import { defineCustomElement } from "../commons/defineCustomElement.ts";
import { BubbleMenuItem } from "../components/bubbles/types.ts";
import { DefaultToolbarKey } from "../components/DefaultToolbarKeys.ts";
import { LanguageItem } from "../extensions/CodeBlockExt.ts";
import { FileUploadExt } from "../extensions/FileUploadExt.ts";
import { organizeHTMLContent } from "../util/htmlUtil.ts";
import { htmlToMd, mdToHtml } from "../util/mdUtil.ts";

defineCustomElement('aie-header', Header);
defineCustomElement('aie-footer', Footer);

export interface NameAndValue {
    name: string,
    value: any;
}


export interface AiEditorEvent {
    type: string;
    value: any;
}

export interface AiEditorEventListener {
    onCreate: (props: EditorEvents['create'], options: AiEditorOptions) => void
    onTransaction: (props: EditorEvents['transaction']) => void
    onEditableChange: (editable: boolean) => void
    onEvent?: (event: AiEditorEvent) => void
}


export type Uploader = (file: File, uploadUrl: string, headers: Record<string, any>, formName: string) => Promise<Record<string, any>>;

export interface UploaderEvent {
    onUploadBefore?: (file: File, uploadUrl: string, headers: Record<string, any>) => void | boolean
    onSuccess?: (file: File, response: any) => any
    onFailed?: (file: File, response: any) => void
    onError?: (file: File, err: any) => void
}

export interface CustomMenu {
    id?: string
    className?: string
    icon?: string
    html?: string
    tip?: string
    onClick?: (event: MouseEvent, editor: AiEditor) => void
    onCreate?: (button: HTMLElement, editor: AiEditor) => void
}

export interface MenuGroup {
    title?: string,
    icon?: string,
    toolbarKeys: (string | CustomMenu | MenuGroup)[],
}

export interface HtmlPasteConfig {
    pasteAsText?: boolean,
    pasteClean?: boolean
    removeEmptyParagraphs?: boolean,
    pasteProcessor?: (html: string) => string
}


export type AiEditorOptions = {
    element: string | Element,
    content?: string,
    contentIsMarkdown?: boolean,
    contentRetention?: boolean,
    contentRetentionKey?: string,
    lang?: string,
    editable?: boolean,
    i18n?: Record<string, Record<string, string>>,
    placeholder?: string,
    theme?: "light" | "dark",
    onMentionQuery?: (query: string) => any[] | Promise<any[]>,
    onCreateBefore?: (editor: AiEditor, extensions: Extensions) => void | Extensions,
    onCreated?: (editor: AiEditor) => void,
    onChange?: (editor: AiEditor) => void,
    onTransaction?: (editor: AiEditor, transaction: Transaction) => void,
    onFocus?: (editor: AiEditor) => void,
    onBlur?: (editor: AiEditor) => void,
    onDestroy?: (editor: AiEditor) => void,
    onSave?: (editor: AiEditor) => boolean,
    onFullscreen?: (isFullscreen: boolean) => void,
    toolbarKeys?: (string | CustomMenu | MenuGroup)[],
    alwaysEnabledToolbarKeys?: string[],
    toolbarExcludeKeys?: DefaultToolbarKey[],
    toolbarSize?: 'small' | 'medium' | 'large',
    draggable?: boolean,
    htmlPasteConfig?: HtmlPasteConfig,
    smartAutoCorrect?: {
        enabled?: boolean,
        capitalizeFirstLetter?: boolean,
        fixCommonTypos?: boolean,
        fixPunctuation?: boolean,
        smartQuotes?: boolean,
        useAI?: boolean,
        aiDebounceTime?: number,
        userDictionary?: Record<string, string>,
    },
    codeBlock?: {
        languages?: LanguageItem[],
        codeExplainPrompt?: string,
        codeCommentsPrompt?: string,
    },
    textSelectionBubbleMenu?: {
        enable?: boolean,
        elementTagName?: string,
        items?: (string | BubbleMenuItem)[],
    },
    link?: {
        autolink?: boolean,
        rel?: string,
        class?: string,
        bubbleMenuItems?: (string | BubbleMenuItem)[],
    },
    container?: {
        defaultType?: string,
        typeItems?: string[],
    },
    uploader?: Uploader,
    image?: {
        customMenuInvoke?: (editor: AiEditor) => void;
        uploadUrl?: string,
        uploadHeaders?: (() => Record<string, any>) | Record<string, any>,
        uploadFormName?: string,
        uploader?: Uploader,
        uploaderEvent?: UploaderEvent,
        defaultSize?: number,
        allowBase64?: boolean,
        bubbleMenuEnable?: boolean,
        bubbleMenuItems?: (string | BubbleMenuItem)[],
    },
    video?: {
        customMenuInvoke?: (editor: AiEditor) => void;
        uploadUrl?: string,
        uploadHeaders?: (() => Record<string, any>) | Record<string, any>,
        uploadFormName?: string,
        uploader?: Uploader,
        uploaderEvent?: UploaderEvent,
    },
    attachment?: {
        customMenuInvoke?: (editor: AiEditor) => void;
        uploadUrl?: string,
        uploadHeaders?: (() => Record<string, any>) | Record<string, any>,
        uploadFormName?: string,
        uploader?: Uploader,
        uploaderEvent?: UploaderEvent,
    },
    fileUpload?: {
        customMenuInvoke?: (editor: AiEditor) => void;
        uploadUrl?: string,
        uploadHeaders?: (() => Record<string, any>) | Record<string, any>,
        uploadFormName?: string,
        uploader?: Uploader,
        uploaderEvent?: UploaderEvent,
        extractContent?: boolean,
        maxExtractSize?: number,
        supportedFormats?: string[],
        parseMode?: 'auto' | 'ask' | 'always' | 'never',
    },
    fontFamily?: {
        values: NameAndValue[]
    },
    fontSize?: {
        defaultValue?: number,
        values?: NameAndValue[]
    },
    lineHeight?: {
        values?: string[]
    },
    emoji?: {
        values?: string[]
    },
    textCounter?: (text: string) => number,
    ai?: AiGlobalConfig,
} & Partial<Omit<EditorOptions, "element">>

const defaultOptions: Partial<AiEditorOptions> = {
    theme: "light",
    lang: "zh",
    contentRetentionKey: "ai-editor-content",
    editable: true,
    draggable: true,
    placeholder: "",
    toolbarSize: 'small',
}

export class InnerEditor extends Tiptap {

    aiEditor: AiEditor;

    constructor(aiEditor: AiEditor, options: Partial<EditorOptions> = {}) {
        super(options);
        this.aiEditor = aiEditor;
    }

    parseHtml(html: string) {
        function bodyElement(value: string): HTMLElement {
            return new window.DOMParser().parseFromString(`<body>${value}</body>`, 'text/html').body
        }

        const parser = DOMParser.fromSchema(this.schema);
        return parser.parse(bodyElement(html), {}).content;
    }

    parseMarkdown(markdown: string) {
        const html = mdToHtml(markdown);
        return this.parseHtml(html);
    }

    insertMarkdown(markdown: string) {
        this.commands.insertContent(mdToHtml(markdown))
    }
}

export class AiEditor {

    customLayout: boolean = false;

    innerEditor!: InnerEditor;

    container!: HTMLDivElement;

    header!: Header;

    mainEl!: HTMLDivElement;

    footer!: Footer;

    options: AiEditorOptions;

    eventComponents: AiEditorEventListener[] = [];

    private _hasShownStorageWarning: boolean = false;

    constructor(_: AiEditorOptions) {
        this.options = {...defaultOptions, ..._};
        this.initI18nAndInnerEditor();
    }

    private initI18nAndInnerEditor() {
        const i18nConfig = this.options.i18n || {};
        const resources = {
            de: {translation: {...de, ...i18nConfig.de}},
            en: {translation: {...en, ...i18nConfig.en}},
            pt: {translation: {...pt, ...i18nConfig.pt}},
            zh: {translation: {...zh, ...i18nConfig.zh}},
            es: {translation: {...es, ...i18nConfig.es}},
            hi: {translation: {...hi, ...i18nConfig.hi}},
            id: {translation: {...id, ...i18nConfig.id}},
            ja: {translation: {...ja, ...i18nConfig.ja}},
            ko: {translation: {...ko, ...i18nConfig.ko}},
            th: {translation: {...th, ...i18nConfig.th}},
            vi: {translation: {...vi, ...i18nConfig.vi}},
        } as Resource;

        //fill the resources but de, en, pt and zh
        for (let key of Object.keys(i18nConfig)) {
            if (key != "de" && key != "en" && key != "pt" && key != "zh") {
                resources[key] = {
                    translation: {...i18nConfig[key]}
                }
            }
        }
        i18next.init({
            lng: this.options.lang, resources,
        }, (_err, _t) => {
            this.initInnerEditor();
        })
    }

    protected initInnerEditor() {
        const rootEl = typeof this.options.element === "string"
            ? document.querySelector(this.options.element) as Element : this.options.element;

        //set the editor theme class
        rootEl.classList.add(`aie-theme-${this.options.theme}`);


        this.container = rootEl.querySelector(".aie-container")!;
        if (!this.container) {
            this.container = document.createElement("div");
            this.container.classList.add("aie-container");
        } else {
            this.customLayout = true;
        }

        rootEl.appendChild(this.container);

        this.mainEl = document.createElement("div");
        this.mainEl.style.flexGrow = "1";
        this.mainEl.style.overflow = "auto";

        this.header = new Header();
        this.eventComponents.push(this.header);

        this.footer = new Footer();
        this.footer.initDraggable(this.options.draggable)
        this.eventComponents.push(this.footer);

        let content = this.options.content;
        if (typeof content === "string") {
            if (this.options.contentIsMarkdown) {
                content = mdToHtml(content)
            } else {
                content = organizeHTMLContent(content)
            }
        }

        if (this.options.contentRetention && this.options.contentRetentionKey) {
            const cacheContent = localStorage.getItem(this.options.contentRetentionKey);
            if (cacheContent) {
                try {
                    content = JSON.parse(cacheContent);
                } catch (e) {
                    console.error(e, "Can not parse the cache content from localStorage.");
                }
            }
        }

        this.innerEditor = new InnerEditor(this, {
            ...this.options as any,
            element: this.mainEl,
            content,
            editable: this.options.editable,
            extensions: this.getExtensions(),
            onCreate: (props) => this.onCreate(props),
            onTransaction: (props) => this.onTransaction(props),
            onFocus: () => this.options?.onFocus?.(this),
            onBlur: () => this.options?.onBlur?.(this),
            onDestroy: () => this.options?.onDestroy?.(this),
            editorProps: {
                attributes: {
                    class: "aie-content"
                },
            }
        })
        
        // Set the editor instance on the window object for global access
        window.editorInstance = this.innerEditor;
    }


    protected getExtensions() {
        let extensions = getExtensions(this, this.options);

        if (this.options.onCreateBefore) {
            const newExtensions = this.options.onCreateBefore(this, extensions);
            if (newExtensions) extensions = newExtensions;
        }

        // Add FileUploadExt to the extensions array
        extensions.push(
            FileUploadExt.configure({
                uploadUrl: this.options.fileUpload?.uploadUrl,
                uploadHeaders: this.options.fileUpload?.uploadHeaders,
                uploader: this.options.fileUpload?.uploader || this.options.uploader,
                uploaderEvent: this.options.fileUpload?.uploaderEvent,
                uploadFormName: this.options.fileUpload?.uploadFormName,
                extractContent: this.options.fileUpload?.extractContent,
                maxExtractSize: this.options.fileUpload?.maxExtractSize,
                supportedFormats: this.options.fileUpload?.supportedFormats,
            })
        );

        return extensions;
    }


    protected onCreate(props: EditorEvents['create']) {
        this.innerEditor.view.dom.style.height = "calc(100% - 20px)"

        this.eventComponents.forEach((zEvent) => {
            zEvent.onCreate && zEvent.onCreate(props, this.options);
        });

        const _header = this.container.querySelector(".aie-container-header") || this.container;
        _header.appendChild(this.header);

        const _main = this.container.querySelector(".aie-container-main") || this.container;
        _main.appendChild(this.mainEl);

        const _footer = this.container.querySelector(".aie-container-footer") || this.container;
        _footer.appendChild(this.footer);

        // Register AI models if configured
        if (this.options.ai && typeof this.options.ai === 'object') {
            try {
                AiModelManager.registerModels(this.innerEditor, this.options.ai);
            } catch (error) {
                console.error('Error registering AI models:', error);
            }
        }

        if (this.options.onCreated) {
            this.options.onCreated(this);
        }
    }

    protected onTransaction(transEvent: EditorEvents['transaction']) {
        this.eventComponents.forEach((component) => {
            component.onTransaction && component.onTransaction(transEvent);
        });

        if (transEvent.transaction.getMeta("ignoreChanged")) {
            return;
        }

        this.options.onTransaction?.(this, transEvent.transaction);

        if (transEvent.transaction.docChanged && this.options.onChange) {
            this.options.onChange(this);
        }

        if (transEvent.transaction.docChanged && this.options.contentRetention && this.options.contentRetentionKey) {
            const html = transEvent.editor.getHTML();
            if ("<p></p>" === html || "" === html) {
                try {
                    localStorage.removeItem(this.options.contentRetentionKey);
                } catch (e) {
                    console.warn("Failed to remove item from localStorage:", e);
                }
            } else {
                const json = transEvent.editor.getJSON();
                try {
                    // Try to save the content to localStorage
                    const jsonString = JSON.stringify(json);
                    
                    // Check if content is likely to exceed quota (over 4MB to leave some buffer)
                    if (jsonString.length > 4 * 1024 * 1024) {
                        console.warn("Content too large for localStorage, consider using 'Save to File' feature");
                        
                        // We'll mark that we've warned the user
                        if (!this._hasShownStorageWarning) {
                            this._hasShownStorageWarning = true;
                            
                            // Show the dialog only once per session
                            setTimeout(() => {
                                this.offerFileDownload().catch(err => {
                                    console.error("Error offering file download:", err);
                                });
                            }, 1000);
                        }
                        
                        // Still try to store a simplified version
                        const simplifiedJson = { ...json };
                        // Remove any large content like base64 images
                        const pruneNodes = (node) => {
                            if (!node || !node.content) return node;
                            
                            // Process node content
                            if (Array.isArray(node.content)) {
                                node.content = node.content.map(child => {
                                    // Remove image data or other large attributes
                                    if (child.type === 'image' && child.attrs && child.attrs.src) {
                                        // If it's a base64 image, replace with a placeholder
                                        if (child.attrs.src.startsWith('data:')) {
                                            child.attrs.src = '[Image data too large to store]';
                                        }
                                    }
                                    return pruneNodes(child);
                                });
                            }
                            return node;
                        };
                        
                        const prunedJson = pruneNodes(simplifiedJson);
                        localStorage.setItem(this.options.contentRetentionKey, JSON.stringify(prunedJson));
                        return; // Skip the regular localStorage attempt
                    }
                    
                    // Standard case - try to save to localStorage
                    localStorage.setItem(this.options.contentRetentionKey, jsonString);
                } catch (error) {
                    console.warn("LocalStorage quota exceeded. Content too large to save automatically.", error);
                    
                    // Show save dialog only once per session
                    if (!this._hasShownStorageWarning) {
                        this._hasShownStorageWarning = true;
                        setTimeout(() => {
                            this.offerFileDownload().catch(err => {
                                console.error("Error offering file download:", err);
                            });
                        }, 1000);
                    }
                    
                    // Handle the error gracefully
                    if (error.name === 'QuotaExceededError') {
                        // Try to save a truncated version or just the essential parts
                        try {
                            // Option 1: Save just the document structure without images
                            const simplifiedJson = { ...json };
                            // Remove any large content like base64 images
                            const pruneNodes = (node) => {
                                if (!node || !node.content) return node;
                                
                                // Process node content
                                if (Array.isArray(node.content)) {
                                    node.content = node.content.map(child => {
                                        // Remove image data or other large attributes
                                        if (child.type === 'image' && child.attrs && child.attrs.src) {
                                            // If it's a base64 image, replace with a placeholder
                                            if (child.attrs.src.startsWith('data:')) {
                                                child.attrs.src = '[Image data too large to store]';
                                            }
                                        }
                                        return pruneNodes(child);
                                    });
                                }
                                return node;
                            };
                            
                            const prunedJson = pruneNodes(simplifiedJson);
                            localStorage.setItem(this.options.contentRetentionKey, JSON.stringify(prunedJson));
                            console.log("Saved simplified version without large embedded content");
                        } catch (fallbackError) {
                            // If even the simplified version is too large
                            console.error("Unable to save document state - content too large for localStorage", fallbackError);
                            
                            // Remove the key to free up space for future saves of smaller content
                            try {
                                localStorage.removeItem(this.options.contentRetentionKey);
                            } catch (e) {
                                // At this point, we've tried everything we can
                                console.error("Failed to manage localStorage:", e);
                            }
                        }
                    }
                }
            }
        }
    }

    getHtml() {
        return this.innerEditor.getHTML();
    }

    getJson() {
        return this.innerEditor.getJSON();
    }

    getText() {
        return this.innerEditor.getText();
    }

    getSelectedText() {
        const selection = this.innerEditor.state.selection;
        if (selection.empty) return "";
        return getTextBetween(this.innerEditor.state.doc, {from: selection.from, to: selection.to})
    }

    getMarkdown() {
        return htmlToMd(this.getHtml())
    }

    getOptions() {
        return this.options;
    }

    getAttributes(name: string) {
        return this.innerEditor.getAttributes(name);
    }

    setAttributes(name: string, attributes: Record<string, any>) {
        this.innerEditor.commands.updateAttributes(name, attributes);
    }

    isActive(nameOrAttrs: any, attrs?: {}) {
        if (typeof nameOrAttrs === "object" || !attrs) {
            return this.innerEditor.isActive(nameOrAttrs);
        } else {
            return this.innerEditor.isActive(nameOrAttrs, attrs);
        }
    }

    commands(): SingleCommands {
        return this.innerEditor.commands;
    }

    commandsChain(): ChainedCommands {
        return this.innerEditor.chain()
    }

    getOutline() {
        const doc = this.innerEditor.state.doc;
        const headings = [] as any[];
        doc.descendants((node, pos) => {
            if (node.type.name === "heading") {

                const id = `aie-heading-${headings.length + 1}`
                if (node.attrs.id !== id) {
                    const {state: {tr}, view: {dispatch}} = this.innerEditor
                    dispatch(tr.setNodeMarkup(pos, void 0, {
                        ...node.attrs,
                        id,
                    }).setMeta("ignoreChanged", true))
                }

                let text = "";
                node.descendants((child) => {
                    if (child.text) {
                        text += child.text;
                    }
                })

                headings.push({
                    id: id,
                    text: text,
                    level: node.attrs.level,
                    pos: pos,
                    size: node.nodeSize,
                })
            }
        })
        return headings;
    }

    focus() {
        this.innerEditor.commands.focus();
        return this;
    }

    focusPos(pos: number) {
        this.innerEditor.commands.focus(pos);
        return this;
    }

    focusStart() {
        this.innerEditor.commands.focus("start");
        return this;
    }

    focusEnd() {
        this.innerEditor.commands.focus("end");
        return this;
    }

    isFocused() {
        return this.innerEditor.isFocused;
    }

    blur() {
        this.innerEditor.commands.blur();
        return this;
    }

    insert(content: any) {
        if (typeof content === "string") {
            content = organizeHTMLContent(content);
        }
        this.innerEditor.commands.insertContent(content);
        return this;
    }

    insertMarkdown(content: string) {
        this.innerEditor.insertMarkdown(content)
        return this;
    }

    setEditable(editable: boolean) {
        this.options.editable = editable;
        this.innerEditor.setEditable(editable, true);
        this.eventComponents.forEach((ec) => {
            ec.onEditableChange(editable)
        })
        return this;
    }

    setContent(content: string) {
        this.focus().clear().insert(content);
        return this;
    }

    setMarkdownContent(content: string) {
        const html = mdToHtml(content)
        return this.setContent(html);
    }

    clear() {
        this.innerEditor.commands.clearContent(true);
        return this;
    }

    isEmpty() {
        return this.innerEditor.isEmpty;
    }

    changeLang(lang: string) {
        this.destroy();
        this.options.lang = lang;
        i18next.changeLanguage(lang);
        this.initInnerEditor();
        return this;
    }

    changeTheme(theme?: "dark" | "light") {
        const rootEl = typeof this.options.element === "string"
            ? document.querySelector(this.options.element) as Element : this.options.element;

        if (!theme) {
            theme = this.options.theme === "dark" ? "light" : "dark";
        }

        rootEl.classList.remove(`aie-theme-${this.options.theme}`);
        rootEl.classList.add(`aie-theme-${theme}`);
        this.options.theme = theme;
    }

    removeRetention() {
        this.options.contentRetentionKey && localStorage.removeItem(this.options.contentRetentionKey);
        return this;
    }

    destroy() {
        this.options.onDestroy?.(this);
        this.innerEditor.destroy();
        this.eventComponents = [];

        //custom layout
        if (this.customLayout) {
            this.header?.remove();
            this.mainEl.remove();
            this.footer?.remove();
        } else {
            this.container.remove();
        }
    }

    isDestroyed() {
        return this.innerEditor.isDestroyed;
    }

    saveToFile(filename = 'document.json') {
        try {
            const content = this.getJson();
            const blob = new Blob([JSON.stringify(content)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create a download link and trigger it
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            return true;
        } catch (error) {
            console.error("Error saving document to file:", error);
            return false;
        }
    }
    
    loadFromFile() {
        return new Promise((resolve, reject) => {
            try {
                // Create a file input element
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                
                input.onchange = (event) => {
                    const file = (event.target as HTMLInputElement).files?.[0];
                    if (!file) {
                        reject(new Error("No file selected"));
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = () => {
                        try {
                            const content = JSON.parse(reader.result as string);
                            this.innerEditor.commands.setContent(content);
                            resolve(true);
                        } catch (parseError) {
                            console.error("Error parsing document file:", parseError);
                            reject(parseError);
                        }
                    };
                    reader.onerror = (error) => reject(error);
                    reader.readAsText(file);
                };
                
                // Trigger the file selection dialog
                input.click();
            } catch (error) {
                console.error("Error loading document from file:", error);
                reject(error);
            }
        });
    }
    
    // Method to offer saving to file when content is too large for localStorage
    offerFileDownload() {
        // Create a modal or dialog to inform the user
        const dialog = document.createElement('div');
        dialog.className = 'aie-file-save-dialog';
        dialog.innerHTML = `
            <div class="aie-file-save-dialog-content">
                <h3>Document Too Large for Auto-Save</h3>
                <p>Your document contains large content (like images) that exceeds the browser's storage limit.</p>
                <p>Would you like to save your work to a file instead?</p>
                <div class="aie-file-save-dialog-buttons">
                    <button class="aie-btn aie-btn-secondary aie-dialog-cancel">Cancel</button>
                    <button class="aie-btn aie-btn-primary aie-dialog-save">Save to File</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Add event listeners
        const cancelBtn = dialog.querySelector('.aie-dialog-cancel');
        const saveBtn = dialog.querySelector('.aie-dialog-save');
        
        return new Promise<boolean>((resolve) => {
            cancelBtn?.addEventListener('click', () => {
                document.body.removeChild(dialog);
                resolve(false);
            });
            
            saveBtn?.addEventListener('click', () => {
                document.body.removeChild(dialog);
                const saved = this.saveToFile();
                resolve(saved);
            });
        });
    }
}
