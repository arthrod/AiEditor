// import { openai } from "./chatgpt.ts";
import { defineCustomElement } from "./commons/defineCustomElement.ts";
import { AgentZeroPanel } from "./components/AgentZeroPanel.ts";
import { FileExport } from "./components/menus/FileExport.ts";
import { FileUpload } from "./components/menus/FileUpload.ts";
import { LocalDocsMenu } from "./components/menus/LocalDocsMenu.ts";
import { SmartAutoCorrect } from "./components/menus/SmartAutoCorrect.ts";
import { SmartPaperFill } from "./components/menus/SmartPaperFill.ts";
import { AgentZeroExt, AgentZeroManager } from "./extensions/AgentZeroExt.ts";

// Register all custom elements first before initializing the editor
defineCustomElement('aie-smart-paper-fill', SmartPaperFill);
defineCustomElement('aie-file-upload', FileUpload);
defineCustomElement('aie-local-docs-menu', LocalDocsMenu);
defineCustomElement('aie-file-export', FileExport);
defineCustomElement('aie-smart-auto-correct', SmartAutoCorrect);
defineCustomElement('aie-agent-zero-panel', AgentZeroPanel);

// Then import editor and other dependencies
import { agentzero } from "./agentzero.ts";
import { AiEditor } from "./core/AiEditor.ts";
import { openrouter } from "./openrouter.ts";
// import {OpenaiModelConfig} from "./ai/openai/OpenaiModelConfig.ts";

// Import the AgentZero components

// TypeScript declarations for global objects
declare global {
    interface Window {
        editorInstance: any;
        aiEditor: any;
        agentzero: {
            panel?: any;
            writeToEditor?: (text: string, options?: any) => boolean;
            write?: (text: string, options?: any) => boolean;
            animateText?: (text: string, speed?: number) => Promise<boolean>;
            startRevolvingAnimation?: () => boolean;
        };
        changeTheme: () => void;
        createAgentZeroCompatibilityAdapter: (editor: any) => any;
        _fullscreenSetup?: boolean;
    }
}

// Create a small delay to ensure custom elements are registered
setTimeout(() => {
    // @ts-ignore
    window.aiEditor = new AiEditor({
        element: "#aiEditor",
        placeholder: "Click to start typing...",
        contentRetention: true,
        lang: "en",
        // toolbarSize: 'small',
        // toolbarSize:'large',
        // pasteAsText: true,
        // draggable:false,
        // theme: "dark",
        // editable:false,
        content: 'AiEditor is an AI-focused next-generation rich text editor.',
        // contentIsMarkdown: true,
        extensions: [
            AgentZeroExt.configure({
                options: {
                    apiKey: agentzero.apiKey,
                    endpoint: agentzero.endpoint,
                    memory: agentzero.capabilities?.memory,
                    toolUsage: agentzero.capabilities?.toolUsage,
                    multiAgent: agentzero.capabilities?.multiAgent,
                    browserAgent: agentzero.capabilities?.browserAgent
                }
            })
        ],
        textSelectionBubbleMenu: {
            // enable:false
            //[AI, Bold, Italic, Underline, Strike, Code]
            // items: ["ai", "Bold", "Italic", "Underline", "Strike", "code"],
        },

        container: {
            defaultType: "default",
            typeItems: ["default", 'info', 'warning', 'danger',]
        },

        fileUpload: {
            extractContent: true,
            maxExtractSize: 10 * 1024 * 1024,
            supportedFormats: ['pdf', 'txt', 'rtf', 'doc', 'docx', 'html', 'htm', 'csv', 'xlsx', 'xls'],
            parseMode: 'auto',
            pdfWorkerSrc: '/pdf.worker.min.mjs',
            preferOffline: true,
        },
        
        // Configure our new file API extension
        fileAPI: {
            maxFileSize: 100 * 1024 * 1024, // 100MB
            allowedFileTypes: ['*'], // Allow all file types
            onFileRead: (file, content) => {
                console.log(`File read: ${file.name}`, content);
            },
            onFileDownload: (filename, content) => {
                console.log(`File downloaded: ${filename}`);
            },
            onError: (error) => {
                console.error('File API error:', error);
            }
        },

        toolbarKeys: [
            "file-upload", 
            "file-export",
            {
                // Add a toolbar button for file import
                html: `<div style="height: 16px">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M3 1H21C21.5523 1 22 1.44772 22 2V22C22 22.5523 21.5523 23 21 23H3C2.44772 23 2 22.5523 2 22V2C2 1.44772 2.44772 1 3 1ZM4 3V21H20V3H4ZM11 15H13V11H16L12 7L8 11H11V15Z"></path>
                        </svg>
                      </div>`,
                tip: "Import File",
                onClick: (editor) => {
                    // Use our new File API extension to import a file
                    editor.commands.openFilePicker({ 
                        accept: '.txt,.md,.csv,.pdf,.json,image/*', 
                        multiple: false 
                    });
                }
            },
            {
                // Add a toolbar button for file export
                html: `<div style="height: 16px">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M3 1H21C21.5523 1 22 1.44772 22 2V22C22 22.5523 21.5523 23 21 23H3C2.44772 23 2 22.5523 2 22V2C2 1.44772 2.44772 1 3 1ZM4 3V21H20V3H4ZM13 15H11V11H8L12 7L16 11H13V15Z"></path>
                        </svg>
                      </div>`,
                tip: "Export Content",
                onClick: (editor) => {
                    // Export the current content
                    const content = editor.getHTML();
                    const date = new Date().toISOString().split('T')[0];
                    editor.commands.saveAsFile({ 
                        filename: `document-${date}.html`, 
                        content: content,
                        mimeType: 'text/html'
                    });
                }
            },
            "divider", "undo", "redo", "brush", "eraser", "divider", "heading", "font-family", "font-size", "divider", "bold", "italic", "underline"
            , "strike", "link", "code", "subscript", "superscript", "hr", "todo", "emoji", "divider", "highlight", "font-color", "divider"
            , "align", "line-height", "divider", "bullet-list", "ordered-list", "indent-decrease", "indent-increase", "break", "divider"
            , "image", "video", "attachment", "quote", "container", "code-block", "table", "divider", "source-code", "printer", "fullscreen", "smart-auto-correct", "local-docs-menu", "smart-paper-fill", "ai", "ai-provider-selector"
            // Add Agent Zero toolbar button
            , {
                html: `<div style="height: 16px">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4Z"/>
                        </svg>
                      </div>`,
                tip: "Agent Zero",
                onClick: onClick
            },
            {
                // Custom theme toggle button
                html: `<div style="height: 16px">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18ZM12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16ZM11 1H13V4H11V1ZM11 20H13V23H11V20ZM3.51472 4.92893L4.92893 3.51472L7.05025 5.63604L5.63604 7.05025L3.51472 4.92893ZM16.9497 18.364L18.364 16.9497L20.4853 19.0711L19.0711 20.4853L16.9497 18.364ZM19.0711 3.51472L20.4853 4.92893L18.364 7.05025L16.9497 5.63604L19.0711 3.51472ZM5.63604 16.9497L7.05025 18.364L4.92893 20.4853L3.51472 19.0711L5.63604 16.9497ZM23 11V13H20V11H23ZM4 11V13H1V11H4Z"></path>
                        </svg>
                      </div>`,
                tip: "Toggle Theme",
                onClick: () => {
                    // Call the existing changeTheme function
                    window.changeTheme();
                }
            },
        ],
        // toolbarExcludeKeys: ["undo", "redo", "brush", "eraser", "heading", "font-family", "font-size"],

        // fontSize:{
        //     defaultValue:18
        // },
        image: {
            //[AlignLeft, AlignCenter, AlignRight, Delete]
            // bubbleMenuEnable:false,
            // bubbleMenuItems: ["AlignLeft", "AlignCenter", "AlignRight", "delete"]
        },
        // textCounter: (text) => {
        //     // console.log("counter", text)
        //     return text.length;
        // },
        link: {
            //[Edit, UnLink, Visit]
            bubbleMenuItems: ["Edit", "UnLink", "visit"],
        },
        codeBlock: {
            languages: [
                {name: 'Auto', value: 'auto'},
                {name: 'Plain Text', value: 'plaintext', alias: ['text', 'txt']},
                {name: 'Bash', value: 'bash', alias: ['sh']},
                {name: 'BASIC', value: 'basic', alias: []},
                {name: 'C', value: 'c', alias: ['h']},
                {name: 'Clojure', value: 'clojure', alias: ['clj', 'edn']},
                {name: 'CMake', value: 'cmake', alias: ['cmake.in']},
            ]
        },
        // htmlPasteConfig: {
        //     pasteAsText: true,
        //     pasteClean: false,
        //     pasteProcessor: (html) => {
        //         return html;
        //     }
        // },
        emoji: {
            // values:['😀', '😃', '😄', '😁', '😆', '😅',],
        },
        // lineHeight:{
        //     values:["1.0","1.1"],
        // },
        // onSave:()=>{
        //     alert("保存")
        //     return true;
        // },
        // image:{
        //     uploadUrl:"http://localhost:8080/api/v1/aieditor/upload/image"
        // },
        ai: {
            models: {
                // spark: {
                //     ...config
                // },
                // openai: {
                //     ...openai
                // },
                openrouter: openrouter as any,
                agentZero: {
                    apiKey: agentzero.apiKey,
                    endpoint: agentzero.endpoint,
                    memory: agentzero.capabilities?.memory,
                    toolUsage: agentzero.capabilities?.toolUsage,
                    multiAgent: agentzero.capabilities?.multiAgent,
                    browserAgent: agentzero.capabilities?.browserAgent,
                    // Additional AgentZero specific config
                    config: agentzero
                },
                // gitee:{
                //     endpoint:"https://ai.gitee.com/api/inference/serverless/KGHCVOPBV7GY/chat/completions",
                //     apiKey:"***",
                // }
            },
            bubblePanelEnable: true,
            bubblePanelModel: "openrouter", // Use OpenRouter as the default model
            onTokenConsume: (modelName, _modelConfig, count) => {
                console.log(modelName, " token count:" + count)
            },
            bubblePanelMenus: [
                {
                    prompt: `<content>{content}</content>\nPlease improve this text, focusing on clarity and professionalism. Return only the improved version with no explanations.`,
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.1986 9.94447C14.7649 9.5337 14.4859 8.98613 14.4085 8.39384L14.0056 5.31138L11.275 6.79724C10.7503 7.08274 10.1433 7.17888 9.55608 7.06948L6.49998 6.50015L7.06931 9.55625C7.17871 10.1435 7.08257 10.7505 6.79707 11.2751L5.31121 14.0057L8.39367 14.4086C8.98596 14.4861 9.53353 14.7651 9.94431 15.1987L12.0821 17.4557L13.4178 14.6486C13.6745 14.1092 14.109 13.6747 14.6484 13.418L17.4555 12.0823L15.1986 9.94447ZM15.2238 15.5079L13.0111 20.1581C12.8687 20.4573 12.5107 20.5844 12.2115 20.442C12.1448 20.4103 12.0845 20.3665 12.0337 20.3129L8.49229 16.5741C8.39749 16.474 8.27113 16.4096 8.13445 16.3918L3.02816 15.7243C2.69958 15.6814 2.46804 15.3802 2.51099 15.0516C2.52056 14.9784 2.54359 14.9075 2.5789 14.8426L5.04031 10.3192C5.1062 10.1981 5.12839 10.058 5.10314 9.92253L4.16 4.85991C4.09931 4.53414 4.3142 4.22086 4.63997 4.16017C4.7126 4.14664 4.78711 4.14664 4.85974 4.16017L9.92237 5.10331C10.0579 5.12855 10.198 5.10637 10.319 5.04048L14.8424 2.57907C15.1335 2.42068 15.4979 2.52825 15.6562 2.81931C15.6916 2.88421 15.7146 2.95507 15.7241 3.02833L16.3916 8.13462C16.4095 8.2713 16.4739 8.39766 16.5739 8.49245L20.3127 12.0338C20.5533 12.2617 20.5636 12.6415 20.3357 12.8821C20.2849 12.9357 20.2246 12.9795 20.1579 13.0112L15.5078 15.224C15.3833 15.2832 15.283 15.3835 15.2238 15.5079ZM16.0206 17.435L17.4348 16.0208L21.6775 20.2634L20.2633 21.6776L16.0206 17.435Z"></path></svg>`,
                    title: 'Improve',
                },
                {
                    prompt: `<content>{content}</content>\nPlease check this text for spelling and grammar errors. Return only the corrected version with no explanations.`,
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 19C12.8284 19 13.5 19.6716 13.5 20.5C13.5 21.3284 12.8284 22 12 22C11.1716 22 10.5 21.3284 10.5 20.5C10.5 19.6716 11.1716 19 12 19ZM6.5 19C7.32843 19 8 19.6716 8 20.5C8 21.3284 7.32843 22 6.5 22C5.67157 22 5 21.3284 5 20.5C5 19.6716 5.67157 19 6.5 19ZM17.5 19C18.3284 19 19 19.6716 19 20.5C19 21.3284 18.3284 22 17.5 22C16.6716 22 16 21.3284 16 20.5C16 19.6716 16.6716 19 17.5 19ZM13 2V4H19V6L17.0322 6.0006C16.2423 8.3666 14.9984 10.5065 13.4107 12.302C14.9544 13.6737 16.7616 14.7204 18.7379 15.3443L18.2017 17.2736C15.8917 16.5557 13.787 15.3326 12.0005 13.7257C10.214 15.332 8.10914 16.5553 5.79891 17.2734L5.26257 15.3442C7.2385 14.7203 9.04543 13.6737 10.5904 12.3021C9.46307 11.0285 8.50916 9.58052 7.76789 8.00128L10.0074 8.00137C10.5706 9.03952 11.2401 10.0037 11.9998 10.8772C13.2283 9.46508 14.2205 7.81616 14.9095 6.00101L5 6V4H11V2H13Z"></path></svg>`,
                    title: 'Fix Grammar',
                },
                '<hr/>',
                {
                    prompt: `<content>{content}</content>\nPlease translate this text. If it's in English, translate to Chinese. If it's in any other language, translate to English. Return only the translation with no explanations.`,
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 15V17C5 18.0544 5.81588 18.9182 6.85074 18.9945L7 19H10V21H7C4.79086 21 3 19.2091 3 17V15H5ZM18 10L22.4 21H20.245L19.044 18H14.954L13.755 21H11.601L16 10H18ZM17 12.8852L15.753 16H18.245L17 12.8852ZM8 2V4H12V11H8V14H6V11H2V4H6V2H8ZM17 3C19.2091 3 21 4.79086 21 7V9H19V7C19 5.89543 18.1046 5 17 5H14V3H17ZM6 6H4V9H6V6ZM10 6H8V9H10V6Z"></path></svg>`,
                    title: 'Translate',
                },
                {
                    prompt: `<content>{content}</content>\nPlease summarize this text concisely. Return only the summary with no explanations.`,
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18 3C19.6569 3 21 4.34315 21 6C21 7.65685 19.6569 9 18 9H15C13.6941 9 12.5831 8.16562 12.171 7.0009L11 7C9.9 7 9 7.9 9 9L9.0009 9.17102C10.1656 9.58312 11 10.6941 11 12C11 13.3059 10.1656 14.4169 9.0009 14.829L9 15C9 16.1 9.9 17 11 17L12.1707 17.0001C12.5825 15.8349 13.6937 15 15 15H18C19.6569 15 21 16.3431 21 18C21 19.6569 19.6569 21 18 21H15C13.6941 21 12.5831 20.1656 12.171 19.0009L11 19C8.79 19 7 17.21 7 15H5C3.34315 15 2 13.6569 2 12C2 10.3431 3.34315 9 5 9H7C7 6.79086 8.79086 5 11 5L12.1707 5.00009C12.5825 3.83485 13.6937 3 15 3H18ZM18 17H15C14.4477 17 14 17.4477 14 18C14 18.5523 14.4477 19 15 19H18C18.5523 19 19 18.5523 19 18C19 17.4477 18.5523 17 18 17ZM8 11H5C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13H8C8.55228 13 9 12.5523 9 12C9 11.4477 8.55228 11 8 11ZM18 5H15C14.4477 5 14 5.44772 14 6C14 6.55228 14.4477 7 15 7H18C18.5523 7 19 6.55228 19 6C19 5.44772 18.5523 5 18 5Z"></path></svg>`,
                    title: 'Summarize',
                },
                '<hr/>',
                {
                    prompt: `<content>{content}</content>\nUsing Agent Zero capabilities, please analyze this text and provide insights. Use tools if necessary to enhance your response.`,
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2ZM12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM12 5C15.866 5 19 8.13401 19 12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12C5 8.13401 8.13401 5 12 5ZM11 7V13H16V15H9V7H11Z"></path></svg>`,
                    title: 'Agent Zero: Analyze',
                    model: "agentZero",
                },
                {
                    prompt: `<content>{content}</content>\nUsing Agent Zero capabilities, please research this topic and provide comprehensive information. Use search tools as needed.`,
                    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.0318 2.1592C19.7278 3.42535 20.8966 5.32792 21.2596 7.49991H15.3957L17.5709 5.32465L16.1567 3.91045L12.0008 8.06642L7.84482 3.91045L6.43061 5.32465L8.60487 7.49891H2.74799C3.11097 5.32692 4.27976 3.42435 5.97582 2.1582C7.67187 0.892058 9.80238 0.338737 11.9709 0.600599C14.1394 0.86246 16.1371 1.92221 17.5321 3.6192C17.5321 3.6192 18.0318 4.1582 18.0318 2.1592ZM21.2596 9.49991H2.73999V11.4999H21.2596V9.49991ZM21.2596 13.4999H2.73999V15.4999H2.74799C3.11097 17.6729 4.27976 19.5754 5.97582 20.8416C7.67187 22.1077 9.80238 22.6611 11.9709 22.3992C14.1394 22.1373 16.1371 21.0776 17.5321 19.3806C17.5321 19.3806 18.0318 18.9999 18.0318 20.9999C19.7278 19.7337 20.8966 17.8312 21.2596 15.6592C21.2596 15.6592 21.2916 13.9999 21.2596 13.4999Z"></path></svg>`,
                    title: 'Agent Zero: Research',
                    model: "agentZero",
                },
            ],
        },
        i18n: {
            zh: {
                // "undo": "撤销(可自定义国际化内容...)",
                // "redo": "重做(可自定义国际化内容!)",
            }
        },
        onMentionQuery: (query) => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    const data = [
                        {
                            id: 1,
                            label: 'Michael Yang'
                        },
                        {
                            id: 2,
                            label: 'Jean Zhou'
                        },
                        {
                            id: 3,
                            label: 'Tom Cruise'
                        },
                        {
                            id: 4,
                            label: 'Madonna'
                        },
                        {
                            id: 5,
                            label: 'Jerry Hall'
                        }
                    ].filter(item => item.label.toLowerCase().startsWith(query.toLowerCase())).slice(0, 5)
                    resolve(data)
                }, 200)
            })
        },
        // Add smart auto-correct configuration
        smartAutoCorrect: {
            enabled: true,
            capitalizeFirstLetter: true,
            fixCommonTypos: true,
            fixPunctuation: true,
            smartQuotes: true,
            useAI: true,
            aiDebounceTime: 2000, // Wait 2 seconds after typing before applying AI corrections
            userDictionary: {
                // Add any custom corrections here
                'ur': 'your',
                'btw': 'by the way',
                'imo': 'in my opinion',
                'tbh': 'to be honest',
                'lmk': 'let me know',
                'idk': 'I don\'t know',
                'iirc': 'if I recall correctly',
                'afaik': 'as far as I know',
                'ftw': 'for the win',
                'omg': 'oh my goodness',
                'brb': 'be right back',
                'lol': 'laughing out loud',
                'bff': 'best friends forever'
            }
        },
    })
}, 0)

// Add editor storage initialization check
function initializeAgentZero(editor: InnerEditor): AgentZeroPanel | null | Promise<AgentZeroPanel | null> {
    if (!editor) {
        console.error('Editor not provided to initializeAgentZero');
        return null;
    }

    if (!editor.storage) {
        console.error('Editor storage not initialized');
        return null;
    }

    console.log('Initializing AgentZero with editor:', editor);
    
    // Check if AgentZero extension has been initialized
    if (!editor.storage.agentZero) {
        console.warn('AgentZero not initialized in editor storage');
        // Try to initialize it if the AgentZeroExt is available
        try {
            // Ensure agentzero global object exists
            if (typeof window.agentzero === 'undefined') {
                console.warn('agentzero global object not found for manual initialization, creating stub');
                window.agentzero = createAgentZeroGlobalStub();
            }
            
            // Re-initialize AgentZero if it's not ready
            editor.storage.agentZero = new AgentZeroManager(
                editor,
                window.agentzero.capabilities || {}
            );
            console.log('AgentZero initialized manually');
        } catch (error) {
            console.error('Failed to manually initialize AgentZero:', error);
            // Create a stub implementation to prevent errors
            console.log('Creating AgentZero compatibility adapter');
            editor.storage.agentZero = createAgentZeroCompatibilityAdapter(editor);
        }
    } else {
        // Ensure the existing AgentZero instance has all required methods
        ensureAgentZeroCompatibility(editor.storage.agentZero);
    }

    // Check if we already have a panel in the DOM
    let existingPanel = document.querySelector('aie-agent-zero-panel');
    if (existingPanel) {
        console.log('Using existing AgentZero panel');
        return existingPanel as AgentZeroPanel;
    }

    // Create mount point if it doesn't exist
    let mountPoint = document.querySelector('#agent-zero-panel');
    if (!mountPoint) {
        console.log('Creating mount point for AgentZero panel');
        mountPoint = document.createElement('div');
        mountPoint.id = 'agent-zero-panel';
        mountPoint.style.position = 'fixed';
        mountPoint.style.bottom = '20px';
        mountPoint.style.right = '20px';
        mountPoint.style.zIndex = '100000'; // Increased to stay above fullscreen
        
        // Wait until document.body is available
        if (!document.body) {
            console.warn('Document body not available, using requestAnimationFrame');
            return new Promise((resolve) => {
                function waitForBody() {
                    if (document.body) {
                        document.body.appendChild(mountPoint);
                        resolve(createPanel(editor));
                    } else {
                        requestAnimationFrame(waitForBody);
                    }
                }
                waitForBody();
            });
        } else {
            document.body.appendChild(mountPoint);
        }
    }

    // Create the panel
    return createPanel(editor);
}

// Standalone createPanel function that can be used by other functions
function createPanel(editor: InnerEditor) {
    // Defer panel creation until editor is ready
    console.log('Creating new AgentZero panel');
    const panel = new AgentZeroPanel({
        editor: editor,
        mountPoint: '#agent-zero-panel',
        storage: editor.storage || {
            getItem: (key: string) => localStorage.getItem(key),
            setItem: (key: string, value: string) => localStorage.setItem(key, value)
        }
    });
    
    // Get the mount point
    const mountPoint = document.querySelector('#agent-zero-panel');
    
    // Make panel visible in the DOM
    if (mountPoint && !mountPoint.contains(panel)) {
        mountPoint.appendChild(panel);
    }

    // Add retry logic for panel initialization
    const initRetry = (attempts = 0, maxAttempts = 5) => {
        if (attempts >= maxAttempts) {
            console.error(`Panel initialization failed after ${maxAttempts} attempts`);
            return false;
        }
        
        try {
            console.log(`Initializing panel, attempt ${attempts + 1}/${maxAttempts}`);
            panel.initialize();
            return true;
        } catch (error) {
            console.warn(`Panel initialization failed, retrying... (${attempts + 1}/${maxAttempts})`, error);
            setTimeout(() => initRetry(attempts + 1, maxAttempts), 500 * Math.pow(1.5, attempts));
            return false;
        }
    };

    return initRetry() ? panel : null;
}

// Function to handle initialization when editor is definitely ready
function initializeAgentZeroWithReadyEditor(editor) {
    console.log('%c[AgentZero] Initializing with ready editor', 'color: #0366d6;');
    try {
        // Check if AgentZero has already been initialized
        if (window.agentzero && window.agentzero.panel) {
            console.log('%c[AgentZero] Already initialized, reusing existing panel', 'color: #0366d6;');
            setupPanelEvents(window.agentzero.panel);
            return window.agentzero.panel;
        }

        // Create a new panel
        const panel = createPanel(editor);
        if (!panel) {
            throw new Error('Failed to create AgentZero panel');
        }

        // Set up global object for AgentZero
        if (!window.agentzero) {
            window.agentzero = {};
        }

        window.agentzero.panel = panel;
        
        // Create a method to write text to the editor
        window.agentzero.writeToEditor = (text, options = {}) => {
            if (panel && typeof panel.writeToEditor === 'function') {
                return panel.writeToEditor(text, options);
            } else {
                console.error('Cannot write to editor: AgentZero panel not initialized properly');
                return false;
            }
        };

        // Set up panel events
        setupPanelEvents(panel);

        return panel;
    } catch (error) {
        console.error('[AgentZero] Error initializing with ready editor:', error);
        if (error.stack) {
            console.error(error.stack);
        }
        return null;
    }
}

// Last resort alternative initialization approach
function tryAlternativeInitialization(editor) {
    console.log('%cAttempting alternative initialization...', 'color: orange');
    
    try {
        // Try creating the panel directly without going through normal initialization
        const mountPoint = document.querySelector('#agent-zero-panel') || document.createElement('div');
        if (!mountPoint.id) {
            mountPoint.id = 'agent-zero-panel';
            mountPoint.style.position = 'fixed';
            mountPoint.style.bottom = '20px';
            mountPoint.style.right = '20px';
            mountPoint.style.zIndex = '9999';
            document.body.appendChild(mountPoint);
        }
        
        // Create panel directly
        const panel = new AgentZeroPanel({
            editor: editor,
            mountPoint: '#agent-zero-panel',
            storage: editor.storage || {
                getItem: (key: string) => localStorage.getItem(key),
                setItem: (key: string, value: string) => localStorage.setItem(key, value)
            }
        });
        
        // Append to DOM
        mountPoint.appendChild(panel);
        
        // Try to initialize it
        try {
            panel.initialize();
            console.log('%cAlternative initialization successful!', 'color: green');
            setupPanelEvents(panel);
        } catch (initError) {
            console.error('Alternative initialization panel.initialize() failed:', initError);
            
            // Try a more direct init approach
            if (typeof panel.init === 'function') {
                try {
                    panel.init(editor);
                    console.log('%cDirect panel.init() successful!', 'color: green');
                    setupPanelEvents(panel);
                } catch (directInitError) {
                    console.error('Direct panel.init() failed:', directInitError);
                }
            }
        }
    } catch (alternativeError) {
        console.error('Alternative initialization completely failed:', alternativeError);
    }
}

// Update click handler with safety checks
function onClick() {
    console.log('%cAgentZero button clicked', 'color: blue; font-weight: bold');

    // Enhanced environment detection
    const isClientSide = typeof window !== 'undefined';
    const isDevelopment = isClientSide && (
        process.env.NODE_ENV === 'development' || 
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1'
    );
    
    console.log(`Environment: ${isDevelopment ? 'Development' : 'Production'}, Client Side: ${isClientSide}`);
    
    // Debug what editor instances are available
    if (isClientSide && isDevelopment) {
        console.log('Available window properties:', {
            editorInstance: window.editorInstance,
            aiEditor: (window as any).aiEditor,
            hasEditor: !!window.editorInstance || !!(window as any).aiEditor
        });
    }

    // Ensure we're in a browser environment
    if (!isClientSide) {
        console.error('Not in browser environment');
        return;
    }
    
    // Set up fullscreen listeners immediately to ensure panel is visible in all modes
    setupEditorFullscreenListener();
    
    // For web environments, ensure the DOM is ready
    if (document.readyState === 'loading') {
        console.log('DOM still loading, waiting for DOMContentLoaded event');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM now loaded, trying AgentZero initialization');
            initializeAgentZeroWithEditor();
        });
        return;
    }
    
    // Check the DOM state
    console.log('DOM State:', document.readyState);
    console.log('Editor elements in DOM:', document.querySelectorAll('.aie-container, .aie-content, #aiEditor').length);
    
    // Check if editor is available
    if (!window.editorInstance && !(window as any).aiEditor?.innerEditor) {
        console.log('%cNo editor instance found - will setup detection', 'color: orange');
        
        // Let's try to find it from the DOM first
        const editorContainer = document.querySelector('.aie-container');
        if (editorContainer) {
            console.log('Found editor container in DOM:', editorContainer);
        }
        
        // Setup initialization with enhanced detection
        setTimeout(() => {
            console.log('Starting editor detection process');
            initializeAgentZeroWithEditor();
        }, 100);
        
        return;
    }
    
    // If we got here, the editor instance exists
    console.log('%cEditor instance found, initializing AgentZero', 'color: green; font-weight: bold');
    try {
        initializeAgentZeroWithEditor();
    } catch (error) {
        console.error('%cError initializing AgentZero:', 'color: red; font-weight: bold', error);
        
        if (isDevelopment) {
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
        }
        
        alert('Could not initialize AgentZero. Please refresh the page and try again.');
    }
}

// Helper function to initialize AgentZero with the editor instance
function initializeAgentZeroWithEditor() {
    // First, ensure we're in a browser environment
    if (typeof window === 'undefined') {
        console.error('Not in browser environment');
        return;
    }

    console.log('Checking editor instance state...');
    
    // Check if the editor is already created and ready
    if (window.editorInstance && 
        typeof window.editorInstance.isDestroyed === 'function' && 
        !window.editorInstance.isDestroyed()) {
        
        console.log('Editor is ready, initializing AgentZero directly');
        initializeAgentZeroWithReadyEditor(window.editorInstance);
    } else {
        console.log('%cEditor not ready - setting up advanced detection', 'color: orange; font-weight: bold');
        
        // Check if we're in development or production environment
        const isDevelopment = process.env.NODE_ENV === 'development' || 
                             window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';
        
        console.log(`Environment: ${isDevelopment ? 'Development' : 'Production'}`);
        
        // Define the editor container selector - may be different in different environments
        const editorSelector = '#aiEditor, .aie-container, [class*="aie"]';
        
        // Find any potential editor containers in the DOM
        const potentialEditorElements = document.querySelectorAll(editorSelector);
        console.log(`Found ${potentialEditorElements.length} potential editor elements in DOM`);
        
        // Set up a MutationObserver to watch for changes
        const targetNode = potentialEditorElements.length > 0 
            ? potentialEditorElements[0].parentElement || document.body 
            : document.querySelector('#aiEditor') || document.body;
        
        console.log(`Setting up observer on:`, targetNode);
        
        // Enhanced polling with multiple detection methods
        const maxAttempts = 15; // Increase max attempts
        let attempts = 0;
        
        const checkEditor = () => {
            attempts++;
            
            // Multiple ways to detect the editor
            const editorDetected = window.editorInstance || 
                                  (window as any).aiEditor?.innerEditor ||
                                  document.querySelector('.aie-content');
            
            if (editorDetected) {
                // Try to get the proper editor instance
                const detectedEditor = window.editorInstance || 
                                      (window as any).aiEditor?.innerEditor;
                
                if (detectedEditor) {
                    console.log('%cEditor found via polling!', 'color: green; font-weight: bold');
                    
                    // In development, add editor to console for debugging
                    if (isDevelopment) {
                        console.log('Editor instance:', detectedEditor);
                    }
                    
                    // Initialize with the detected editor
                    initializeAgentZeroWithReadyEditor(detectedEditor);
                    return true;
                } else {
                    console.log('Found editor elements but no instance yet, continuing to poll...');
                }
            }
            
            if (attempts >= maxAttempts) {
                console.error('%cEditor instance not ready after maximum attempts. Giving up.', 'color: red; font-weight: bold');
                
                // In development, show what instances are available on window for debugging
                if (isDevelopment) {
                    console.log('Available on window:', Object.keys(window).filter(k => 
                        k.toLowerCase().includes('editor') || 
                        k.toLowerCase().includes('ai')
                    ));
                }
                
                return false;
            } else {
                // Adjust the interval between attempts based on how many we've tried
                const adjustedInterval = Math.min(500 * Math.pow(1.2, Math.floor(attempts/3)), 2000);
                console.log(`Retrying editor detection in ${Math.round(adjustedInterval)}ms (attempt ${attempts}/${maxAttempts})`);
                setTimeout(checkEditor, adjustedInterval);
                return false;
            }
        };
        
        // Try once immediately
        if (!checkEditor()) {
            // Set up an enhanced MutationObserver as a backup
            console.log('Setting up MutationObserver as backup detection method');
            
            const observer = new MutationObserver((mutations) => {
                // Look for editor-related elements in mutations
                const editorRelatedChange = mutations.some(mutation => {
                    // Check for editor-related class names
                    if (mutation.target && (mutation.target as Element).className &&
                        typeof (mutation.target as Element).className === 'string' &&
                        ((mutation.target as Element).className.includes('aie') || 
                         (mutation.target as Element).className.includes('editor'))) {
                        return true;
                    }
                    
                    // Check added nodes
                    return Array.from(mutation.addedNodes).some(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element;
                            return element.className && 
                                  typeof element.className === 'string' && 
                                 (element.className.includes('aie') || 
                                  element.className.includes('editor'));
                        }
                        return false;
                    });
                });
                
                if (editorRelatedChange) {
                    console.log('Editor-related DOM changes detected, checking for editor instance...');
                }
                
                if (window.editorInstance || (window as any).aiEditor?.innerEditor) {
                    const editor = window.editorInstance || (window as any).aiEditor?.innerEditor;
                    if (editor && typeof editor.isDestroyed === 'function' && !editor.isDestroyed()) {
                        console.log('%cEditor found via MutationObserver!', 'color: green; font-weight: bold');
                        observer.disconnect();
                        initializeAgentZeroWithReadyEditor(editor);
                    }
                }
            });
            
            // Observe with more comprehensive options
            observer.observe(targetNode, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'id'],
                characterData: false
            });
            
            // Set a timeout to disconnect the observer after a reasonable time
            setTimeout(() => {
                observer.disconnect();
                console.log('MutationObserver disconnected due to timeout');
                
                // One final attempt after the observer times out
                if (window.editorInstance || (window as any).aiEditor?.innerEditor) {
                    const finalEditor = window.editorInstance || (window as any).aiEditor?.innerEditor;
                    if (finalEditor) {
                        console.log('%cEditor found on final check!', 'color: green; font-weight: bold');
                        initializeAgentZeroWithReadyEditor(finalEditor);
                    }
                }
            }, 15000); // Extend timeout to 15 seconds
        }
    }
}

// Helper function to set up panel events
function setupPanelEvents(panel) {
    console.log('%c[AgentZero] Setting up panel events', 'color: #0366d6;');
    
    try {
        // Ensure the panel is in the DOM
        if (!document.contains(panel)) {
            console.log('Panel is not in the DOM, attaching it to the body');
            // Check for the panel's mount point
            let mountPoint = document.querySelector('#agent-zero-panel');
            if (!mountPoint) {
                console.log('Creating mount point for the panel');
                mountPoint = document.createElement('div');
                mountPoint.id = 'agent-zero-panel';
                document.body.appendChild(mountPoint);
            }
            
            // Append panel to the mount point
            mountPoint.appendChild(panel);
        }
        
        // Make sure the panel is visible in the UI
        ensurePanelVisibility(panel);
        
        // Setup global listeners for editor fullscreen changes
        setupEditorFullscreenListener();
        
        // Set up event listeners
        panel.addEventListener('mount', function() {
            console.log('%c[AgentZero] Panel mounted, initializing global AgentZero object', 'color: #0366d6;');
            
            // Create a Promise that resolves or rejects after timeout
            const initWithTimeout = new Promise((resolve, reject) => {
                try {
                    // Get the editor from the panel
                    const editor = panel.editor;
                    
                    // Ensure both are available
                    if (!editor) {
                        reject(new Error('Editor not available'));
                        return;
                    }
                    
                    // Initialize the global AgentZero object if needed
                    if (!window.agentzero) {
                        window.agentzero = {};
                    }
                    
                    // Link the panel to the global object
                    window.agentzero.panel = panel;
                    
                    // Initialize the global API
                    createGlobalAgentZeroAPI();
                    
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            });
            
            // Setup initialization with timeout
            Promise.race([
                initWithTimeout,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Panel initialization timed out')), 5000))
            ])
            .then(() => {
                console.log('%c[AgentZero] Panel initialization successful', 'color: #0a8');
                showFeedbackToUser('Agent Zero initialized successfully', 'success');
            })
            .catch(error => {
                console.error('%c[AgentZero] Panel initialization failed:', 'color: #e52;', error);
                showFeedbackToUser('Agent Zero initialization failed: ' + error.message, 'error');
            });
        });
        
        // Handle panel errors
        panel.addEventListener('error', function(event) {
            console.error('%c[AgentZero] Panel error:', 'color: #e52;', event.detail);
            showFeedbackToUser('Agent Zero error: ' + event.detail.message, 'error');
        });
        
        // Mark the panel as initialized in the DOM for debugging
        panel.dataset.initialized = 'true';
        
        return panel;
    } catch (error) {
        console.error('Error setting up panel events:', error);
        return null;
    }
}

/**
 * Helper function to type with a delay
 */
async function typeWithDelay(panel, text, speed = 50) {
    if (!panel || typeof panel.writeToEditor !== 'function') {
        return Promise.reject(new Error('Invalid panel object'));
    }
    
    return new Promise<void>(resolve => {
        panel.writeToEditor(text, {
            typing: true,
            typingSpeed: speed,
            highlight: false
        });
        
        // Calculate total time for typing
        const totalTime = text.length * speed + 100;
        setTimeout(resolve, totalTime);
    });
}

/**
 * Helper function to sleep
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a global API for AgentZero functionalities
 */
function createGlobalAgentZeroAPI() {
    // Create or get the global object
    if (!window.agentzero) {
        window.agentzero = {};
    }
    
    // Define the global write function (if not already defined)
    if (!window.agentzero.write) {
        window.agentzero.write = (text, options = {}) => {
            // Try to use the panel if available
            if (window.agentzero.panel && typeof window.agentzero.panel.writeToEditor === 'function') {
                return window.agentzero.panel.writeToEditor(text, options);
            }
            
            // Fallback direct implementation
            try {
                const editorElement = document.querySelector('.aie-content[contenteditable="true"]') as HTMLElement;
                if (!editorElement) {
                    console.error('Could not find editor element');
                    return false;
                }
                
                // Set default options
                const defaultOptions = {
                    append: true,
                    typing: true,
                    typingSpeed: 50,
                    highlight: true
                };
                
                const mergedOptions = { ...defaultOptions, ...options };
                
                // Handle typing effect
                if (mergedOptions.typing) {
                    editorElement.focus();
                    
                    if (!mergedOptions.append) {
                        editorElement.innerHTML = '';
                    }
                    
                    // Remove empty state
                    if (editorElement.classList.contains('is-editor-empty')) {
                        editorElement.classList.remove('is-editor-empty');
                    }
                    
                    // Find or create a paragraph
                    let paragraph = editorElement.querySelector('p');
                    if (!paragraph) {
                        paragraph = document.createElement('p');
                        editorElement.appendChild(paragraph);
                    }
                    
                    // Type text character by character
                    let i = 0;
                    const typeCharacter = () => {
                        if (i < text.length) {
                            const char = text.charAt(i);
                            
                            if (char === '\n') {
                                const newParagraph = document.createElement('p');
                                editorElement.appendChild(newParagraph);
                                paragraph = newParagraph;
                            } else {
                                paragraph.appendChild(document.createTextNode(char));
                            }
                            
                            i++;
                            setTimeout(typeCharacter, mergedOptions.typingSpeed);
                        }
                    };
                    
                    typeCharacter();
                    return true;
                } else {
                    // Direct insertion
                    if (!mergedOptions.append) {
                        editorElement.innerHTML = '';
                    }
                    
                    editorElement.innerHTML += `<p>${text}</p>`;
                    return true;
                }
            } catch (error) {
                console.error('Error writing to editor:', error);
                return false;
            }
        };
    }
    
    // Define function to start revolving animation
    if (!window.agentzero.startRevolvingAnimation) {
        window.agentzero.startRevolvingAnimation = () => {
            const panel = window.agentzero.panel;
            if (panel && typeof panel.startRevolvingAnimation === 'function') {
                panel.startRevolvingAnimation();
                return true;
            } else {
                console.error('Revolving animation not available');
                return false;
            }
        };
    }
    
    // Add animateText function for typing text with animations
    if (!window.agentzero.animateText) {
        window.agentzero.animateText = async (text, speed = 50) => {
            if (!text) return false;
            
            try {
                // Split text into lines
                const lines = text.split('\n');
                
                // Clear editor
                window.agentzero.write('', { append: false, typing: false });
                
                // Type each line with a small delay between lines
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line) {
                        await typeWithDelay(window.agentzero.panel, line + (i < lines.length - 1 ? '\n' : ''), speed);
                        if (i < lines.length - 1) {
                            await sleep(Math.min(300, speed * 3));
                        }
                    }
                }
                
                return true;
            } catch (error) {
                console.error('Error animating text:', error);
                return false;
            }
        };
    }
    
    // Log available methods
    console.log('%c[AgentZero] Global API available:', 'color: #0366d6;', 
        Object.keys(window.agentzero).filter(key => typeof window.agentzero[key] === 'function')
    );
    
    return window.agentzero;
}

// Initialize the global API when the window loads
window.addEventListener('load', () => {
    createGlobalAgentZeroAPI();
});

// Helper to ensure panel is visible in the UI
function ensurePanelVisibility(panel) {
    // Ensure the panel element is visible in the DOM
    if (panel && panel.style) {
        panel.style.display = 'block';
        panel.style.visibility = 'visible';
    }
    
    // Find panel's mount point and ensure it's visible
    const mountPoint = document.querySelector('#agent-zero-panel');
    if (mountPoint && mountPoint.style) {
        mountPoint.style.display = 'block';
        mountPoint.style.visibility = 'visible';
        mountPoint.style.zIndex = '100000'; // Increased to be above fullscreen
    }
    
    // Ensure panel content is open
    try {
        const panelContent = panel.shadowRoot?.querySelector('.agent-zero-panel-content');
        if (panelContent) {
            panelContent.classList.add('open');
            
            // Update toggle button text
            const toggleButton = panel.shadowRoot?.querySelector('#toggle-panel');
            if (toggleButton) {
                toggleButton.textContent = 'Close';
            }
        }
        
        // Make sure the panel is visible even in fullscreen mode
        const panelElement = panel.shadowRoot?.querySelector('.agent-zero-panel');
        if (panelElement) {
            // Check if editor is in fullscreen mode
            const editorContainer = document.querySelector('.aie-container');
            const isFullscreen = editorContainer && (
                editorContainer.style.position === 'fixed' || 
                editorContainer.style.position === 'absolute' ||
                document.fullscreenElement !== null
            );
            
            if (isFullscreen) {
                panelElement.style.zIndex = '100000'; // Higher than editor fullscreen z-index
                panelElement.classList.add('editor-fullscreen-active');
                console.log('Panel visibility ensured in fullscreen mode');
            }
            
            // Add a pulse effect that repeats 3 times
            panelElement.style.animation = 'glow 1s infinite ease-in-out';
            
            // After 3 seconds, return to normal animation
            setTimeout(() => {
                panelElement.style.animation = 'glow 2s infinite ease-in-out';
            }, 3000);
        }
    } catch (error) {
        console.warn('Could not update panel styles', error);
    }
}

// Function to show feedback to users
function showFeedbackToUser(message, type = 'info') {
    console.log(`Feedback to user: ${message} (${type})`);
    
    // Create a toast notification element
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '10px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.padding = '8px 16px';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '10000';
    toast.style.fontSize = '14px';
    toast.style.transition = 'opacity 0.3s ease-in-out';
    
    // Style based on type
    if (type === 'error') {
        toast.style.backgroundColor = '#f44336';
        toast.style.color = 'white';
    } else if (type === 'success') {
        toast.style.backgroundColor = '#4caf50';
        toast.style.color = 'white';
    } else {
        toast.style.backgroundColor = '#2196f3';
        toast.style.color = 'white';
    }
    
    // Add to DOM
    document.body.appendChild(toast);
    
    // Remove after delay
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Function to create a compatibility adapter for AgentZero
function createAgentZeroCompatibilityAdapter(editor: InnerEditor) {
    // Create a compatibility layer if the AgentZero extension is not properly loaded
    const adapter = {
        getAllAgents: () => new Map([['main', {
            id: 'main',
            memory: [],
            createdAt: new Date(),
            subordinates: [],
            superior: null,
            status: 'idle'
        }]]),
        getActiveAgent: () => ({ 
            id: 'main', 
            memory: [], 
            createdAt: new Date(), 
            subordinates: [], 
            superior: null, 
            status: 'idle' 
        }),
        getAllMemory: () => [],
        getToolHistory: () => [],
        writeToEditor: (text, options = {}) => {
            // Try to use the global function if available
            if (window.agentzero && typeof window.agentzero.writeToEditor === 'function') {
                return window.agentzero.writeToEditor(text, options);
            }
            
            // Fallback method if global function is not available
            try {
                const editorElement = document.querySelector('.aie-content[contenteditable="true"]') as HTMLElement;
                if (!editorElement) return false;
                
                if (!options.append) {
                    editorElement.innerHTML = '';
                }
                
                // Add the text to the editor
                editorElement.innerHTML += `<p>${text}</p>`;
                editorElement.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
            } catch (error) {
                console.error('Error writing to editor:', error);
                return false;
            }
        }
    };
    
    return adapter;
}

// Function to ensure an AgentZero instance has all required methods
function ensureAgentZeroCompatibility(agentZero: any) {
    // Make sure basic methods exist
    if (!agentZero.getAllAgents) {
        agentZero.getAllAgents = () => new Map();
    }
    
    if (!agentZero.getActiveAgent) {
        agentZero.getActiveAgent = () => ({ id: 'main', memory: [], status: 'idle' });
    }
    
    if (!agentZero.getAllMemory) {
        agentZero.getAllMemory = () => [];
    }
    
    if (!agentZero.getToolHistory) {
        agentZero.getToolHistory = () => [];
    }
    
    // Add the writeToEditor method if it doesn't exist
    if (!agentZero.writeToEditor && window.agentzero && typeof window.agentzero.writeToEditor === 'function') {
        agentZero.writeToEditor = window.agentzero.writeToEditor;
    }
    
    return agentZero;
}

// Create a stub implementation of the agentzero global object
function createAgentZeroGlobalStub() {
    console.log('Creating agentzero global stub');
    return {
        init: () => {
            console.log('Stub agentzero.init() called');
            return Promise.resolve();
        },
        getAllAgents: () => [],
        getAllMemory: () => [],
        getToolHistory: () => [],
        getActiveAgent: () => ({ id: 'main' }),
        setActiveAgent: (id) => {},
        executeTask: (task) => Promise.resolve({ success: true }),
        createAgent: (id) => id,
        addMemory: (content) => ({ id: `mem-${Date.now()}`, content, timestamp: new Date() }),
        clearMemory: () => {},
        syncWithEditor: () => {},
        capabilities: {
            memory: true,
            toolUsage: true,
            multiAgent: true,
            browserAgent: false
        },
        // Add any other methods that might be called by the AgentZero UI
        execute: (task) => {
            console.warn('Stub agentzero.execute() called, no real functionality');
            return Promise.resolve({ success: true, message: 'Execution stub' });
        }
    };
}

// Expose compatibility adapter to the window object for use by other components
window.createAgentZeroCompatibilityAdapter = createAgentZeroCompatibilityAdapter;

// Setup global listeners for editor fullscreen changes
function setupEditorFullscreenListener() {
    // This function sets up a global listener to detect when the editor enters or exits fullscreen mode
    
    // Check if we've already set up the listener
    if (window._fullscreenSetup) return;
    window._fullscreenSetup = true;
    
    // Helper function to find the AgentZero panel
    function findAgentZeroPanel() {
        return document.querySelector('aie-agent-zero-panel');
    }
    
    // Helper function to handle fullscreen change
    function handleFullscreenChange() {
        const isFullscreen = document.fullscreenElement !== null;
        const panel = findAgentZeroPanel();
        if (!panel) return;

        try {
            // Call the panel's method if it exists
            if (typeof panel.ensureVisibilityInFullscreen === 'function') {
                isFullscreen ? panel.ensureVisibilityInFullscreen() : panel.restoreNormalVisibility();
            } else {
                // Fallback implementation
                const panelElement = panel.shadowRoot?.querySelector('.agent-zero-panel');
                if (panelElement) {
                    if (isFullscreen) {
                        panelElement.classList.add('editor-fullscreen-active');
                        (panelElement as HTMLElement).style.zIndex = '100000';
                    } else {
                        panelElement.classList.remove('editor-fullscreen-active');
                        (panelElement as HTMLElement).style.zIndex = '10000';
                    }
                }
            }
        } catch (error) {
            console.warn('Error handling fullscreen state change for panel:', error);
        }
    }
    
    // Observe editor container style changes 
    function observeEditorContainer() {
        const editorContainer = document.querySelector('.aie-container');
        if (!editorContainer) return;
        
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'style' &&
                    mutation.target instanceof HTMLElement) {
                    
                    const target = mutation.target as HTMLElement;
                    const isInFullscreenMode = 
                        target.style.position === 'fixed' || 
                        target.style.position === 'absolute';
                    
                    if (isInFullscreenMode) {
                        const panel = findAgentZeroPanel();
                        if (panel && panel.shadowRoot) {
                            const panelElement = panel.shadowRoot.querySelector('.agent-zero-panel');
                            if (panelElement) {
                                panelElement.classList.add('editor-fullscreen-active');
                                (panelElement as HTMLElement).style.zIndex = '100000';
                            }
                        }
                    }
                }
            });
        });
        
        observer.observe(editorContainer, {
            attributes: true,
            attributeFilter: ['style'],
        });
    }
    
    // Listen to fullscreen events
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // Wait for DOM content to be loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', observeEditorContainer);
    } else {
        observeEditorContainer();
    }
    
    // Watch for fullscreen button clicks
    document.addEventListener('click', (e) => {
        if (e.target && e.target instanceof Element) {
            const isFullscreenButton = 
                e.target.closest('.aie-button-fullscreen') || 
                e.target.matches('.aie-button-fullscreen') ||
                (e.target.innerHTML && e.target.innerHTML.includes('fullscreen'));
            
            if (isFullscreenButton) {
                setTimeout(() => {
                    const panel = findAgentZeroPanel();
                    if (panel && panel.shadowRoot) {
                        const panelElement = panel.shadowRoot.querySelector('.agent-zero-panel');
                        if (panelElement) {
                            panelElement.classList.add('editor-fullscreen-active');
                            (panelElement as HTMLElement).style.zIndex = '100000';
                        }
                    }
                }, 200);
            }
        }
    }, true);
}
