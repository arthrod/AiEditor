import { EditorEvents } from "@tiptap/core";
import { defineCustomElement } from "../commons/defineCustomElement.ts";
import { AiEditorEventListener, AiEditorOptions } from "../core/AiEditor.ts";
import { initToolbarKeys } from "../util/initToolbarKeys.ts";
import { AbstractMenuButton } from "./AbstractMenuButton.ts";
import { defaultToolbarKeys } from "./DefaultToolbarKeys.ts";
import { Ai } from "./menus/Ai.ts";
import { AiProviderSelector } from "./menus/AiProviderSelector.ts";
import { Align } from "./menus/Align";
import { ApiKeyManager } from "./menus/ApiKeyManager.ts";
import { Attachment } from "./menus/Attachment";
import { Bold } from "./menus/Bold";
import { Break } from "./menus/Break";
import { BulletList } from "./menus/BulletList";
import { Code } from "./menus/Code";
import { CodeBlock } from "./menus/CodeBlock";
import { Container } from "./menus/Container.ts";
import { Custom } from "./menus/Custom.ts";
import { Divider } from "./menus/Divider";
import { Emoji } from "./menus/Emoji";
import { Eraser } from "./menus/Eraser";
import { FileUpload } from "./menus/FileUpload";
import { FontColor } from "./menus/FontColor";
import { FontFamily } from "./menus/FontFamily";
import { FontSize } from "./menus/FontSize";
import { Fullscreen } from "./menus/Fullscreen";
import { Group } from "./menus/Group.ts";
import { Heading } from "./menus/Heading.ts";
import { Highlight } from "./menus/Highlight";
import { Hr } from "./menus/Hr";
import { Image } from "./menus/Image";
import { IndentDecrease } from "./menus/IndentDecrease";
import { IndentIncrease } from "./menus/IndentIncrease";
import { Italic } from "./menus/Italic";
import { LineHeight } from "./menus/LineHeight";
import { Link } from "./menus/Link";
import { LocalDocsMenu } from "./menus/LocalDocsMenu.ts";
import { ModelSelector } from "./menus/ModelSelector.ts";
import { OrderedList } from "./menus/OrderedList";
import { Painter } from "./menus/Painter";
import { Printer } from "./menus/Printer";
import { Quote } from "./menus/Quote";
import { Redo } from "./menus/Redo";
import { SourceCode } from "./menus/SourceCode";
import { Strike } from "./menus/Strike";
import { Subscript } from "./menus/Subscript";
import { Superscript } from "./menus/Superscript";
import { Table } from "./menus/Table";
import { Todo } from "./menus/Todo";
import { Underline } from "./menus/Underline";
import { Undo } from "./menus/Undo";
import { Video } from "./menus/Video";

defineCustomElement('aie-undo', Undo);
defineCustomElement('aie-redo', Redo);
defineCustomElement('aie-brush', Painter);
defineCustomElement('aie-container', Container);
defineCustomElement('aie-custom', Custom);
defineCustomElement('aie-eraser', Eraser);
defineCustomElement('aie-heading', Heading);
defineCustomElement('aie-font-family', FontFamily);
defineCustomElement('aie-font-size', FontSize);
defineCustomElement('aie-bold', Bold);
defineCustomElement('aie-italic', Italic);
defineCustomElement('aie-underline', Underline);
defineCustomElement('aie-strike', Strike);
defineCustomElement('aie-link', Link);
defineCustomElement('aie-source-code', SourceCode);
defineCustomElement('aie-code', Code);
defineCustomElement('aie-subscript', Subscript);
defineCustomElement('aie-superscript', Superscript);
defineCustomElement('aie-highlight', Highlight);
defineCustomElement('aie-font-color', FontColor);
defineCustomElement('aie-divider', Divider);
defineCustomElement('aie-bullet-list', BulletList);
defineCustomElement('aie-ordered-list', OrderedList);
defineCustomElement('aie-indent-decrease', IndentDecrease);
defineCustomElement('aie-indent-increase', IndentIncrease);
defineCustomElement('aie-align', Align);
defineCustomElement('aie-todo', Todo);
defineCustomElement('aie-line-height', LineHeight);
defineCustomElement('aie-quote', Quote);
defineCustomElement('aie-image', Image);
defineCustomElement('aie-video', Video);
defineCustomElement('aie-code-block', CodeBlock);
defineCustomElement('aie-hr', Hr);
defineCustomElement('aie-table', Table);
defineCustomElement('aie-break', Break);
defineCustomElement('aie-attachment', Attachment);
defineCustomElement('aie-fullscreen', Fullscreen);
defineCustomElement('aie-printer', Printer);
defineCustomElement('aie-emoji', Emoji);
defineCustomElement('aie-ai', Ai);
defineCustomElement('aie-group', Group);
defineCustomElement('aie-ai-provider-selector', AiProviderSelector);
defineCustomElement('aie-model-selector', ModelSelector);
defineCustomElement('aie-api-key-manager', ApiKeyManager);
defineCustomElement('aie-file-upload', FileUpload);
defineCustomElement('aie-local-docs-menu', LocalDocsMenu);

export type MenuButtonOptions = {
    key: string,
    title: string,
    svg: string,
}

export class Header extends HTMLElement implements AiEditorEventListener {
    // template:string;
    menuButtons: AbstractMenuButton[] = [];

    constructor() {
        super();
    }

    connectedCallback() {
        if (this.children && this.children.length > 0) {
            return
        }
        const divElement = document.createElement("div");
        for (let menuButton of this.menuButtons) {
            divElement.appendChild(menuButton);
        }
        divElement.style.display = "flex"
        divElement.style.flexWrap = "wrap"
        this.appendChild(divElement)
    }

    onCreate(event: EditorEvents["create"], options: AiEditorOptions): void {
        let toolbarKeys = options.toolbarKeys || defaultToolbarKeys;
        toolbarKeys = toolbarKeys.filter((tool) => {
            if (typeof tool === "string") {
                return !options.toolbarExcludeKeys?.includes(tool as any);
            }
            return true;
        }).filter((tool, index, array) => {
            const prevTool = array[index - 1];
            if (typeof tool === "string" && (typeof prevTool === "string" || typeof prevTool === "undefined")) {
                const dividers = ["divider", "|", undefined];
                return dividers.includes(tool) ? !dividers.includes(prevTool) : true;
            }
            return true;
        })
        initToolbarKeys(event, options, this.menuButtons, toolbarKeys);
    }


    onTransaction(event: EditorEvents["transaction"]): void {
        for (let menuButton of this.menuButtons) {
            if (menuButton && typeof menuButton.onTransaction === 'function') {
                menuButton.onTransaction(event);
            }
        }
    }

    onEditableChange(editable: boolean) {
        for (let menuButton of this.menuButtons) {
            if (menuButton && typeof menuButton.onEditableChange === 'function') {
                menuButton.onEditableChange(editable);
            }
        }
    }

    protected createToolbar(item: string | CustomMenu | MenuGroup, parent: HTMLElement) {
        
        let element: any;
        
        if (typeof item === 'object' && (item as CustomMenu).onClick) {
            const customConfig = item as CustomMenu;
            const customMenu = new CustomMenuButton(this.editor, {
                tip: customConfig.tip,
                className: customConfig.className,
                icon: customConfig.icon,
                html: customConfig.html,
                onClick: customConfig.onClick
            });
            if (customConfig.onCreate) {
                customConfig.onCreate(customMenu, this.editor);
            }
            element = customMenu;
        } else if (typeof item === 'object' && (item as MenuGroup).toolbarKeys) {
            const customConfig = item as MenuGroup;
            const menuGroup = new MenuGroupButton(this.editor, customConfig);
            element = menuGroup;
        } else if (item === 'undo') {
            element = new Undo(this.editor);
        } else if (item === 'redo') {
            element = new Redo(this.editor);
        } else if (item === 'brush') {
            element = new FormatBrush(this.editor);
        } else if (item === 'eraser') {
            element = new FormatEraser(this.editor);
        } else if (item === 'heading') {
            element = new Heading(this.editor);
        } else if (item === 'font-family') {
            element = new FontFamily(this.editor);
        } else if (item === 'font-size') {
            element = new FontSize(this.editor);
        } else if (item === 'bold') {
            element = new Bold(this.editor);
        } else if (item === 'italic') {
            element = new Italic(this.editor);
        } else if (item === 'underline') {
            element = new Underline(this.editor);
        } else if (item === 'strike') {
            element = new Strike(this.editor);
        } else if (item === 'link') {
            element = new Link(this.editor);
        } else if (item === 'source-code') {
            element = new SourceCodeButton(this.editor);
        } else if (item === 'code') {
            element = new Code(this.editor);
        } else if (item === 'subscript') {
            element = new Subscript(this.editor);
        } else if (item === 'superscript') {
            element = new Superscript(this.editor);
        } else if (item === 'hr') {
            element = new Hr(this.editor);
        } else if (item === 'todo') {
            element = new TodoList(this.editor);
        } else if (item === 'emoji') {
            element = new Emoji(this.editor);
        } else if (item === 'highlight') {
            element = new Highlight(this.editor);
        } else if (item === 'font-color') {
            element = new FontColor(this.editor);
        } else if (item === 'align') {
            element = new Align(this.editor);
        } else if (item === 'line-height') {
            element = new LineHeight(this.editor);
        } else if (item === 'bullet-list') {
            element = new BulletList(this.editor);
        } else if (item === 'ordered-list') {
            element = new OrderedList(this.editor);
        } else if (item === 'indent-decrease') {
            element = new IndentDecrease(this.editor);
        } else if (item === 'indent-increase') {
            element = new IndentIncrease(this.editor);
        } else if (item === 'break') {
            element = new LineBreak(this.editor);
        } else if (item === 'image') {
            element = new Image(this.editor);
        } else if (item === 'video') {
            element = new Video(this.editor);
        } else if (item === 'attachment') {
            element = new Attachment(this.editor);
        } else if (item === 'file-upload') {
            element = new FileUpload(this.editor);
        } else if (item === 'quote') {
            element = new Quote(this.editor);
        } else if (item === 'container') {
            element = new Container(this.editor);
        } else if (item === 'code-block') {
            element = new CodeBlock(this.editor);
        } else if (item === 'table') {
            element = new Table(this.editor);
        } else if (item === 'printer') {
            element = new PrinterButton(this.editor);
        } else if (item === 'fullscreen') {
            element = new FullscreenButton(this.editor);
        } else if (item === 'divider') {
            element = new ToolbarDivider();
        } else if (item === 'ai-provider-selector') {
            element = new AiProviderSelector(this.editor);
        } else if (item === 'model-selector') {
            element = new ModelSelector(this.editor);
        } else if (item === 'api-key-manager') {
            element = new ApiKeyManager(this.editor);
        } else if (item === 'smart-paper-fill') {
            element = new SmartPaperFill(this.editor);
        } else if (item === 'local-docs-menu') {
            element = new LocalDocsMenu(this.editor);
        } else if (item === 'ai') {
            element = new AiMenuButton(this.editor);
        } else {
            console.warn(`Warning: Unsupported toolbar key ${item}`);
            return;
        }
        
        if (element instanceof AbstractMenuButton) {
            this.menuButtons.push(element);
        }
        
        parent.appendChild(element);
    }
}



