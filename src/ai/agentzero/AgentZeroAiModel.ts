import { agentZeroConfig, agentzero } from "../../agentzero.ts";
import { AiGlobalConfig } from "../AiGlobalConfig.ts";
import { AiClient } from "../core/AiClient.ts";
import { InnerEditor } from "../core/AiEditor.ts";
import { AiMessageListener } from "../core/AiMessageListener.ts";
import { AiModel } from "../core/AiModel.ts";
import { AgentZeroClient } from "./AgentZeroClient.ts";

export interface AgentZeroModelOptions {
    apiKey?: string;
    endpoint?: string;
    memory?: boolean;
    toolUsage?: boolean;
    multiAgent?: boolean;
    browserAgent?: boolean;
}

export class AgentZeroAiModel extends AiModel {
    private options: AgentZeroModelOptions;
    private client: AgentZeroClient;

    constructor(
        private editor: InnerEditor,
        options: AgentZeroModelOptions = {}
    ) {
        // Use injected editor instance
        super(editor, {
            models: { 
                agentZero: {
                    apiKey: options.apiKey,
                    endpoint: options.endpoint,
                    storage: editor.storage
                } 
            } 
        } as AiGlobalConfig, "agentZero");

        // Add storage fallback
        const agentZeroConfig = this.globalConfig.models.agentZero as any;
        if (!agentZeroConfig.storage) {
            agentZeroConfig.storage = {
                getItem: (key: string) => localStorage.getItem(key),
                setItem: (key: string, value: string) => localStorage.setItem(key, value)
            };
        }

        // Defer initialization check
        agentzero.mount().then(initialized => {
            if (!initialized) {
                console.warn('AgentZero panel initialization delayed');
            }
        }).catch(error => {
            console.error('AgentZero mount failed:', error);
        });

        this.options = {
            apiKey: options.apiKey,
            endpoint: options.endpoint,
            memory: options.memory !== undefined ? options.memory : agentZeroConfig.memory,
            toolUsage: options.toolUsage !== undefined ? options.toolUsage : agentZeroConfig.toolUsage,
            multiAgent: options.multiAgent !== undefined ? options.multiAgent : agentZeroConfig.multiAgent,
            browserAgent: options.browserAgent !== undefined ? options.browserAgent : agentZeroConfig.browserAgent
        };

        this.client = new AgentZeroClient({
            apiKey: this.options.apiKey,
            endpoint: this.options.endpoint,
            memory: this.options.memory,
            toolUsage: this.options.toolUsage,
            multiAgent: this.options.multiAgent,
            browserAgent: this.options.browserAgent
        });
    }

    createAiClientUrl(): string {
        return this.options.endpoint || 'https://openrouter.ai/api/v1/chat/completions';
    }

    createAiClient(url: string, listener: AiMessageListener): AiClient {
        return this.client as unknown as AiClient;
    }

    wrapPayload(prompt: string): any {
        // Format the message for Agent Zero
        const messages = [
            {
                role: "system",
                content: agentZeroConfig.customPrompts.system
            },
            {
                role: "user",
                content: agentZeroConfig.customPrompts.user.replace('{content}', prompt)
            }
        ];

        const tools = this.getToolsForPrompt();

        return {
            model: "openai/gpt-4o",
            messages: messages,
            stream: true,
            temperature: 0.7,
            max_tokens: 4096,
            tools: tools
        };
    }

    /**
     * Handle specialized Agent Zero capabilities
     */
    chat(selectedText: string, prompt: string, listener: AiMessageListener): void {
        // Override the default chat method to use our specialized client
        const finalPrompt = prompt.includes("{content}") ? 
            prompt.split('{content}').join(selectedText) : 
            `${selectedText ? selectedText + "\n" : ""}${prompt}`;
        
        const messages = [
            {
                role: "system",
                content: agentZeroConfig.customPrompts.system
            },
            {
                role: "user",
                content: agentZeroConfig.customPrompts.user.replace('{content}', finalPrompt)
            }
        ];

        const options = {
            model: "openai/gpt-4o",
            temperature: 0.7,
            max_tokens: 4096,
            tools: this.getToolsForPrompt()
        };

        // Create a wrapped listener that converts between different message formats
        const wrappedListener: AiMessageListener = {
            onStart: (client) => {
                listener.onStart(client);
            },
            onMessage: (message) => {
                listener.onMessage(message);
            },
            onStop: () => {
                listener.onStop();
            }
        };

        // Directly call the client for Agent Zero functionality
        this.client.chat(messages as any, options, wrappedListener as any);
    }

    /**
     * Configure the available tools based on options
     */
    private getToolsForPrompt() {
        const tools = [];
        
        if (this.options.toolUsage) {
            tools.push(
                {
                    type: 'function',
                    function: {
                        name: 'search',
                        description: 'Search the web for information',
                        parameters: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: 'The search query'
                                }
                            },
                            required: ['query']
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'code',
                        description: 'Execute code in a sandbox environment',
                        parameters: {
                            type: 'object',
                            properties: {
                                language: {
                                    type: 'string',
                                    description: 'The programming language'
                                },
                                code: {
                                    type: 'string',
                                    description: 'The code to execute'
                                }
                            },
                            required: ['language', 'code']
                        }
                    }
                },
                {
                    type: 'function',
                    function: {
                        name: 'terminal',
                        description: 'Execute terminal commands',
                        parameters: {
                            type: 'object',
                            properties: {
                                command: {
                                    type: 'string',
                                    description: 'The command to execute'
                                }
                            },
                            required: ['command']
                        }
                    }
                }
            );
        }
        
        if (this.options.memory) {
            tools.push({
                type: 'function',
                function: {
                    name: 'memory',
                    description: 'Save information to memory',
                    parameters: {
                        type: 'object',
                        properties: {
                            content: {
                                type: 'string',
                                description: 'The content to save'
                            },
                            tags: {
                                type: 'array',
                                items: {
                                    type: 'string'
                                },
                                description: 'Optional tags for categorization'
                            }
                        },
                        required: ['content']
                    }
                }
            });
        }
        
        if (this.options.browserAgent) {
            tools.push({
                type: 'function',
                function: {
                    name: 'browser',
                    description: 'Browse the web and extract information',
                    parameters: {
                        type: 'object',
                        properties: {
                            url: {
                                type: 'string',
                                description: 'The URL to navigate to'
                            },
                            action: {
                                type: 'string',
                                description: 'Optional action to perform (click, extract, scroll)'
                            },
                            selector: {
                                type: 'string',
                                description: 'Optional CSS selector for the action'
                            }
                        },
                        required: ['url']
                    }
                }
            });
        }
        
        if (this.options.multiAgent) {
            tools.push({
                type: 'function',
                function: {
                    name: 'delegate',
                    description: 'Delegate a task to a sub-agent',
                    parameters: {
                        type: 'object',
                        properties: {
                            agent: {
                                type: 'string',
                                description: 'The agent to delegate to'
                            },
                            task: {
                                type: 'string',
                                description: 'The task description'
                            }
                        },
                        required: ['agent', 'task']
                    }
                }
            });
        }
        
        return tools;
    }
} 