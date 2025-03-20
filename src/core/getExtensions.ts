import { Extensions } from "@tiptap/core";
import { CharacterCount } from "@tiptap/extension-character-count";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { Highlight } from "@tiptap/extension-highlight";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { all, createLowlight } from "lowlight";
import { AgentZeroExt } from "../extensions/AgentZeroExt.ts";
import { AiCommandExt, defaultCommands } from "../extensions/AiCommandExt.ts";
import { AttachmentExt } from "../extensions/AttachmentExt.ts";
import { ClassNameExt } from "../extensions/ClassNameExt.ts";
import { CodeBlockExt, languages } from "../extensions/CodeBlockExt.ts";
import { CommentMarkExt } from "../extensions/CommentMarkExt.ts";
import { ContainerExt, defaultItems } from "../extensions/ContainerExt.ts";
import { FigcaptionExt } from "../extensions/FigcaptionExt.ts";
import { FigureExt } from "../extensions/FigureExt.ts";
import { FontSizeExt } from "../extensions/FontSizeExt.ts";
import { HeadingExt } from "../extensions/HeadingExt.ts";
import { IFrameExt } from "../extensions/IFrameExt.ts";
import { ImageExt } from "../extensions/ImageExt.ts";
import { IndentExt } from "../extensions/IndentExt.ts";
import { LineHeightExt } from "../extensions/LineHeightExt.ts";
import { LocalDocsExt } from "../extensions/LocalDocsExt.ts";
import { createMention } from "../extensions/MentionExt.ts";
import { PainterExt } from "../extensions/PainterExt.ts";
import { PasteExt } from "../extensions/PasteExt.ts";
import { SaveExt } from "../extensions/SaveExt.ts";
import { SelectionMarkerExt } from "../extensions/SelectionMarkerExt.ts";
import { SmartAutoCorrectExt } from "../extensions/SmartAutoCorrectExt.ts";
import { VideoExt } from "../extensions/VideoExt.ts";
import { AiEditor, AiEditorOptions } from "./AiEditor.ts";
import { getBubbleMenus } from "./getBubbleMenus.ts";

export const getExtensions = (editor: AiEditor, options: AiEditorOptions): Extensions => {
    // the Collaboration extension comes with its own history handling
    const ret: Extensions = [StarterKit.configure({
        codeBlock: false,
        heading: false,
    })];

    // Add AgentZero extension early in the extensions chain
    // to ensure it's initialized before other components need it
    if (options.ai) {
        ret.push(
            AgentZeroExt.configure({
                options: {
                    memory: options.ai?.agentZero?.memory !== undefined ? options.ai.agentZero.memory : true,
                    toolUsage: options.ai?.agentZero?.toolUsage !== undefined ? options.ai.agentZero.toolUsage : true,
                    multiAgent: options.ai?.agentZero?.multiAgent !== undefined ? options.ai.agentZero.multiAgent : true,
                    browserAgent: options.ai?.agentZero?.browserAgent !== undefined ? options.ai.agentZero.browserAgent : false,
                    apiKey: options.ai?.agentZero?.apiKey,
                    endpoint: options.ai?.agentZero?.endpoint,
                    customPrompts: options.ai?.agentZero?.customPrompts || {}
                }
            })
        );
    }

    {
        //push default extensions
        ret.push(Underline, TextStyle, FontFamily,
            HeadingExt,
            AttachmentExt.configure({
                uploadUrl: options.attachment?.uploadUrl,
                uploadHeaders: options.attachment?.uploadHeaders,
                uploadFormName: options.attachment?.uploadFormName,
                uploader: options.attachment?.uploader || options.uploader,
                uploaderEvent: options.attachment?.uploaderEvent,
            }),
            PainterExt,
            SelectionMarkerExt,
            CommentMarkExt,
            Highlight.configure({
                multicolor: true
            }),
            Color, FontSizeExt, LineHeightExt,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            IndentExt,
            ImageExt.configure({
                allowBase64: typeof options.image?.allowBase64 === "undefined" ? true : options.image?.allowBase64,
                defaultSize: options.image?.defaultSize || 350,
                uploadUrl: options.image?.uploadUrl,
                uploadHeaders: options.image?.uploadHeaders,
                uploadFormName: options.image?.uploadFormName,
                uploader: options.image?.uploader || options.uploader,
                uploaderEvent: options.image?.uploaderEvent,
            }),
            SmartAutoCorrectExt.configure({
                enabled: typeof options.smartAutoCorrect?.enabled === "undefined" ? true : options.smartAutoCorrect?.enabled,
                capitalizeFirstLetter: typeof options.smartAutoCorrect?.capitalizeFirstLetter === "undefined" ? true : options.smartAutoCorrect?.capitalizeFirstLetter,
                fixCommonTypos: typeof options.smartAutoCorrect?.fixCommonTypos === "undefined" ? true : options.smartAutoCorrect?.fixCommonTypos,
                fixPunctuation: typeof options.smartAutoCorrect?.fixPunctuation === "undefined" ? true : options.smartAutoCorrect?.fixPunctuation,
                smartQuotes: typeof options.smartAutoCorrect?.smartQuotes === "undefined" ? true : options.smartAutoCorrect?.smartQuotes,
                useAI: typeof options.smartAutoCorrect?.useAI === "undefined" ? true : options.smartAutoCorrect?.useAI,
                aiDebounceTime: options.smartAutoCorrect?.aiDebounceTime || 2000,
                userDictionary: options.smartAutoCorrect?.userDictionary || {},
            }),
            Table.configure({
                resizable: true,
                lastColumnResizable: true,
                allowTableNodeSelection: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            CharacterCount.configure({
                textCounter: typeof options?.textCounter === "function"
                    ? options.textCounter : (text) => text.length
            }),
            Link.configure({
                openOnClick: false,
                autolink: typeof options.link?.autolink === "undefined" ? true : options.link?.autolink,
                HTMLAttributes: {
                    ref: options?.link?.rel,
                    class: options?.link?.class,
                }
            }),
            Superscript,
            Subscript,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            CodeBlockExt.configure({
                lowlight: createLowlight(all),
                defaultLanguage: 'auto',
                languageClassPrefix: 'language-',
                languages: options.codeBlock?.languages || languages,
                codeExplainAi: options.ai?.codeBlock?.codeExplain || {
                    model: "auto",
                    prompt: options.codeBlock?.codeExplainPrompt || "帮我对这个代码进行解释，返回代码的解释内容，注意，不需要对代码的注释进行解释",
                },
                codeCommentsAi: options.ai?.codeBlock?.codeComments || {
                    model: "auto",
                    prompt: options.codeBlock?.codeCommentsPrompt || "帮我对这个代码添加代码注释，并返回添加注释的代码，注意只需要返回代码。",
                },
            }),
            VideoExt.configure({
                uploadUrl: options.video?.uploadUrl,
                uploadHeaders: options.video?.uploadHeaders,
                uploadFormName: options.video?.uploadFormName,
                uploader: options.video?.uploader || options.uploader,
                uploaderEvent: options.video?.uploaderEvent,
            }),
            IFrameExt,
            FigureExt,
            FigcaptionExt,
            SaveExt.configure({
                onSave: options.onSave,
            }),
            PasteExt,
            ClassNameExt,
            ContainerExt.configure({
                defaultType: options.container?.defaultType || "warning",
                typeItems: options.container?.typeItems || defaultItems,
            }),
            ...getBubbleMenus(editor),
        )
    }

    if (options.placeholder) {
        ret.push(Placeholder.configure({
            placeholder: options.placeholder,
        }))
    }

    // if (options.ai?.command){
    ret.push(AiCommandExt.configure({
        suggestion: {
            items: (_) => {
                const commands = options.ai?.commands || defaultCommands;
                return commands as any;
            }
        }
    }))
    // }

    if (options.onMentionQuery) {
        ret.push(createMention(options.onMentionQuery))
    }

    ret.push(LocalDocsExt.configure({
        storagePrefix: 'aieditor',
        maxDocuments: 100,
        autoSaveInterval: 30000, // 30 seconds
        onDocumentSaved: (doc) => {
            console.log('Document saved:', doc.id, doc.title);
        },
        onDocumentLoaded: (doc) => {
            console.log('Document loaded:', doc.id, doc.title);
        },
        onDocumentDeleted: (docId) => {
            console.log('Document deleted:', docId);
        }
    }));

    return ret;
}
