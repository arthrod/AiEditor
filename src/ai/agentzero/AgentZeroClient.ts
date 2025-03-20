import { AiClient } from "../core/AiClient.ts";
import { AiMessage } from "../core/AiMessage.ts";
import { AiMessageListener } from "../core/AiMessageListener.ts";

interface MemoryItem {
    content: string;
    timestamp: Date;
    id: string;
    tags?: string[];
}

export interface AgentZeroClientOptions {
    apiKey?: string;
    endpoint?: string;
    memory?: boolean;
    toolUsage?: boolean;
    multiAgent?: boolean;
    browserAgent?: boolean;
}

export class AgentZeroClient implements AiClient {
    private apiKey: string;
    private endpoint: string;
    private memory: MemoryItem[] = [];
    private subAgents: Set<string> = new Set();
    private options: AgentZeroClientOptions;
    private abortController: AbortController | null = null;
    
    constructor(options: AgentZeroClientOptions = {}) {
        this.apiKey = options.apiKey || process.env.OPENROUTER_API_KEY || '';
        this.endpoint = options.endpoint || 'https://openrouter.ai/api/v1/chat/completions';
        this.options = options;
        
        // Load memory from localStorage if enabled
        if (options.memory !== false) {
            this.loadMemory();
        }
    }
    
    /**
     * Send a chat request to the API - compatible with AiClient interface
     */
    async start(payload: string): Promise<void> {
        // Parse the payload
        const data = JSON.parse(payload);
        const listener = this._currentListener;
        
        // Start the listener
        if (listener?.onStart) {
            listener.onStart(this);
        }
        
        try {
            // Create abort controller for cancellation
            this.abortController = new AbortController();
            
            // Make the API request if we have an API key, otherwise simulate
            if (this.apiKey) {
                await this.makeApiRequest(data, listener);
            } else {
                await this.simulateResponse(data.messages, data, listener);
            }
            
            // Notify listener when done
            if (listener?.onStop) {
                listener.onStop();
            }
        } catch (error) {
            console.error('Error in chat:', error);
            // Don't call onStop here as it will be called in the finally block
        }
    }
    
    /**
     * Stop the ongoing request
     */
    stop(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }
    
    // Private property to store the current listener
    private _currentListener: AiMessageListener | null = null;
    
    /**
     * Send a chat request to the API - agent-specific interface
     */
    async chat(messages: any[], options: any, listener: AiMessageListener): Promise<void> {
        // Store the listener for use in start()
        this._currentListener = listener;
        
        try {
            // Get the model from options or use default with fallback strategy
            let model = options.model || 'openai/gpt-4o';
            
            // Check if we should use a free model based on URL parameters or localStorage preference
            const urlParams = new URLSearchParams(window.location.search);
            const forceFreeModel = urlParams.get('useFreeModel') === 'true' || localStorage.getItem('agentZeroUseFreeModel') === 'true';
            
            // Use free model if explicitly requested
            if (forceFreeModel) {
                model = 'deepseek/deepseek-r1-zero:free';
                console.log('Using free model due to user preference:', model);
            }
            
            // Create the request payload
            const payload = {
                model: model,
                messages: messages,
                stream: true,
                temperature: options.temperature || 0.7,
                max_tokens: options.max_tokens || 1024, // Reduced max tokens for free models
                tools: options.tools || []
            };
            
            // Start the processing using the AiClient interface
            await this.start(JSON.stringify(payload));
        } catch (error) {
            console.error('Error in chat:', error);
            if (listener?.onStop) {
                listener.onStop();
            }
        }
    }
    
    /**
     * Make a real API request
     */
    private async makeApiRequest(payload: any, listener: AiMessageListener | null): Promise<void> {
        console.log('Making API request to:', this.endpoint);
        console.log('With payload:', JSON.stringify(payload, null, 2));
        
        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': window.location.href
                },
                body: JSON.stringify(payload),
                signal: this.abortController?.signal
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorObj;
                
                try {
                    // Try to parse error response as JSON
                    errorObj = JSON.parse(errorText);
                } catch (e) {
                    // If not JSON, use the raw text
                    errorObj = { message: errorText };
                }
                
                // Check for credit limit errors from OpenRouter
                const isCreditLimitError = 
                    (errorObj.error?.message && errorObj.error.message.includes('credits are required')) ||
                    (errorObj.message && errorObj.message.includes('credits are required')) ||
                    errorText.includes('credits are required');
                
                if (isCreditLimitError) {
                    console.warn('OpenRouter credit limit reached, switching to free model');
                    
                    // Store preference for free model in localStorage
                    localStorage.setItem('agentZeroUseFreeModel', 'true');
                    
                    // Check if we're already using the free model
                    const isUsingFreeModel = payload.model === 'deepseek/deepseek-r1-zero:free';
                    
                    if (isUsingFreeModel) {
                        // We're already using the free model but still hit limits
                        const limitMsg = 'Even with the free model, you have reached OpenRouter API limits. ' +
                            'Falling back to simulation mode.\n\n' +
                            'To use the AI capabilities, please try again later or upgrade your account at: ' +
                            'https://openrouter.ai/settings/credits';
                        
                        // Display message to user
                        if (window.agentzero && typeof window.agentzero.writeToEditor === 'function') {
                            window.agentzero.writeToEditor(limitMsg, {
                                append: false,
                                typing: false,
                                highlight: false
                            });
                        }
                        
                        // Send notification through listener
                        if (listener?.onMessage) {
                            const message: AiMessage = {
                                role: 'assistant',
                                content: limitMsg,
                                index: 0,
                                status: 1
                            };
                            listener.onMessage(message);
                        }
                        
                        // Fall back to simulation
                        await this.simulateResponse(payload.messages, payload, listener);
                        return;
                    }
                    
                    // Switch to free model and try again
                    const freeModelMsg = 'Switching to free Deepseek model due to OpenRouter credit limits...';
                    
                    // Display message to user
                    if (window.agentzero && typeof window.agentzero.writeToEditor === 'function') {
                        window.agentzero.writeToEditor(freeModelMsg, {
                            append: false,
                            typing: false,
                            highlight: false
                        });
                    }
                    
                    console.log('Retrying with free model: deepseek/deepseek-r1-zero:free');
                    
                    // Modify payload to use free model with reduced tokens
                    const freePayload = {
                        ...payload,
                        model: 'deepseek/deepseek-r1-zero:free',
                        max_tokens: 1024 // Reduced max tokens for free model
                    };
                    
                    // Retry the request with the free model
                    try {
                        const retryResponse = await fetch(this.endpoint, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${this.apiKey}`,
                                'HTTP-Referer': window.location.href
                            },
                            body: JSON.stringify(freePayload),
                            signal: this.abortController?.signal
                        });
                        
                        if (!retryResponse.ok) {
                            throw new Error(`Free model API request failed: ${retryResponse.status}`);
                        }
                        
                        // Process the retry response - re-using the reader code
                        const reader = retryResponse.body?.getReader();
                        if (!reader) {
                            throw new Error('Response body is not readable');
                        }
                        
                        // Continue with normal processing using the reader
                        // This will read the stream from the free model response
                        console.log('Successfully switched to free model, processing response');
                        await this.processResponseStream(reader, listener, freePayload);
                        return;
                    } catch (retryError) {
                        console.error('Error with free model fallback:', retryError);
                        // If retry with free model fails, fall back to simulation
                        await this.simulateResponse(payload.messages, payload, listener);
                        return;
                    }
                }
                
                // Handle other API errors
                throw new Error(`API request failed: ${response.status} ${errorText}`);
            }
            
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Response body is not readable');
            }
            
            // Process the response stream
            await this.processResponseStream(reader, listener, payload);
        } catch (error) {
            console.error('Error making API request:', error);
            
            // Check if the error message indicates a credit limit issue
            const errorMsg = error instanceof Error ? error.message : String(error);
            if (errorMsg.includes('credits are required')) {
                console.warn('Credit limit error caught in catch block, trying free model');
                
                // Store preference for free model in localStorage
                localStorage.setItem('agentZeroUseFreeModel', 'true');
                
                // Check if we're already using the free model
                const isUsingFreeModel = payload.model === 'deepseek/deepseek-r1-zero:free';
                
                if (isUsingFreeModel) {
                    // Already using free model but still hit limits, switch to simulation
                    const limitMsg = 'Even with the free model, you have reached OpenRouter API limits. ' +
                        'Falling back to simulation mode.';
                    
                    if (window.agentzero && typeof window.agentzero.writeToEditor === 'function') {
                        window.agentzero.writeToEditor(limitMsg, {
                            append: false,
                            typing: false,
                            highlight: false
                        });
                    }
                    
                    // Fall back to simulation
                    await this.simulateResponse(payload.messages, payload, listener);
                    return;
                }
                
                // Try one more time with the free model
                try {
                    console.log('Retrying with free model: deepseek/deepseek-r1-zero:free');
                    
                    // Modify the payload for free model
                    const freePayload = {
                        ...payload,
                        model: 'deepseek/deepseek-r1-zero:free',
                        max_tokens: 1024
                    };
                    
                    // Make a new request with the free model
                    const retryResponse = await fetch(this.endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.apiKey}`,
                            'HTTP-Referer': window.location.href
                        },
                        body: JSON.stringify(freePayload),
                        signal: this.abortController?.signal
                    });
                    
                    if (!retryResponse.ok) {
                        throw new Error(`Free model API request failed: ${retryResponse.status}`);
                    }
                    
                    const reader = retryResponse.body?.getReader();
                    if (!reader) {
                        throw new Error('Response body is not readable');
                    }
                    
                    // Process the retry response
                    await this.processResponseStream(reader, listener, freePayload);
                } catch (retryError) {
                    console.error('Error with free model fallback:', retryError);
                    // If retry fails, fall back to simulation
                    await this.simulateResponse(payload.messages, payload, listener);
                }
                
                return;
            }
            
            // For other errors, display the error message
            if (window.agentzero && typeof window.agentzero.writeToEditor === 'function') {
                window.agentzero.writeToEditor(`Error: ${errorMsg}`, {
                    append: false,
                    typing: false,
                    highlight: false
                });
            }
            
            if (listener?.onMessage) {
                const message: AiMessage = {
                    role: 'assistant',
                    content: `Error: ${errorMsg}`,
                    index: 0,
                    status: 2 // Final message (error)
                };
                listener.onMessage(message);
            }
        }
    }
    
    /**
     * Process a response stream from the API
     * Extracted to avoid code duplication between initial request and retry with free model
     */
    private async processResponseStream(reader: ReadableStreamDefaultReader<Uint8Array>, listener: AiMessageListener | null, payload: any): Promise<void> {
        const decoder = new TextDecoder();
        let buffer = '';
        let messageIndex = 0;
        let fullContent = ''; // Track the full content for writing to editor
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process the buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.substring(6));
                        
                        // Check if response contains an error
                        if (data.error) {
                            console.error('API responded with an error:', data.error);
                            
                            // Special handling for credit limit errors
                            if (data.error.message && data.error.message.includes('credits are required')) {
                                console.warn('OpenRouter credit limit reached during streaming, falling back to simulation');
                                
                                // Fall back to simulation mode
                                await this.simulateResponse(payload.messages, payload, listener);
                                return;
                            }
                            
                            // Send error message to the user - avoiding duplicate text
                            const errorMessage = data.error.message || JSON.stringify(data.error);
                            const errorMsg = `Error from API: ${errorMessage}`;
                            
                            // Write error to editor
                            if (window.agentzero && typeof window.agentzero.writeToEditor === 'function') {
                                window.agentzero.writeToEditor(errorMsg, {
                                    append: false, // Replace any existing content with the error
                                    typing: false, // No typing animation for errors
                                    highlight: false
                                });
                            }
                            
                            // Send error message to listener
                            if (listener?.onMessage) {
                                const message: AiMessage = {
                                    role: 'assistant',
                                    content: errorMsg,
                                    index: messageIndex++,
                                    status: 2 // Final message (error)
                                };
                                
                                listener.onMessage(message);
                            }
                            
                            // Break out of the loop - we don't need to process anything else
                            return;
                        }
                        
                        // Normal response handling for data with choices
                        if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
                            console.warn('Received malformed response data:', data);
                            continue; // Skip this message and continue
                        }
                        
                        // Handle different API response formats - OpenAI vs OpenRouter vs others
                        let content = '';
                        const choice = data.choices[0];
                        
                        // Check all possible content locations in response
                        if (choice.delta?.content !== undefined) {
                            // OpenAI streaming format
                            content = choice.delta.content;
                        } else if (choice.delta?.text !== undefined) {
                            // Some APIs use 'text' instead of 'content'
                            content = choice.delta.text;
                        } else if (choice.text !== undefined) {
                            // Simplified format without delta
                            content = choice.text;
                        } else if (choice.content !== undefined) {
                            // Direct content format
                            content = choice.content;
                        } else if (typeof choice.message?.content === 'string') {
                            // Format with message object
                            content = choice.message.content;
                        } else {
                            // Log the actual structure for debugging
                            console.log('Unknown response format:', JSON.stringify(choice));
                            continue; // Skip this iteration
                        }
                        
                        if (content) {
                            // Accumulate full content
                            fullContent += content;
                            
                            // Write to editor directly
                            if (window.agentzero && typeof window.agentzero.writeToEditor === 'function') {
                                // If it's the first chunk, replace content, otherwise append
                                const isFirstChunk = messageIndex === 0;
                                window.agentzero.writeToEditor(content, {
                                    append: !isFirstChunk,
                                    typing: true,
                                    typingSpeed: 1, // Fast typing for streaming effect
                                    highlight: false
                                });
                            }
                            
                            if (listener?.onMessage) {
                                // Create a properly formatted AiMessage
                                const message: AiMessage = {
                                    role: 'assistant',
                                    content: content,
                                    index: messageIndex++,
                                    status: messageIndex === 1 ? 0 : 1
                                };
                                
                                listener.onMessage(message);
                                
                                // Check for tool usage
                                this.checkForToolUsage(content, listener);
                            }
                        }
                    } catch (e) {
                        console.warn('Error parsing SSE message:', e, 'Original data:', line.substring(6));
                        
                        // Try to safely extract error information even if JSON parsing failed
                        try {
                            // Check if this looks like an error response
                            const errorLine = line.substring(6);
                            
                            // Check for credit limit errors
                            if (errorLine.includes('credits are required')) {
                                console.warn('Credit limit reached during streaming (parse error), falling back to simulation');
                                
                                // Check if we're already using the free model
                                if (payload.model === 'deepseek/deepseek-r1-zero:free') {
                                    const limitMsg = 'Free model API limits reached. Falling back to simulation mode.';
                                    
                                    if (window.agentzero && typeof window.agentzero.writeToEditor === 'function') {
                                        window.agentzero.writeToEditor(limitMsg, {
                                            append: false,
                                            typing: false,
                                            highlight: false
                                        });
                                    }
                                } else {
                                    // Show a helpful message about switching to free model
                                    const creditErrorMsg = 'OpenRouter credit limit reached. Trying free model instead...';
                                    
                                    if (window.agentzero && typeof window.agentzero.writeToEditor === 'function') {
                                        window.agentzero.writeToEditor(creditErrorMsg, {
                                            append: false,
                                            typing: false,
                                            highlight: false
                                        });
                                    }
                                    
                                    // Try with free model
                                    const freePayload = {
                                        ...payload,
                                        model: 'deepseek/deepseek-r1-zero:free',
                                        max_tokens: 1024
                                    };
                                    
                                    try {
                                        const retryResponse = await fetch(this.endpoint, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${this.apiKey}`,
                                                'HTTP-Referer': window.location.href
                                            },
                                            body: JSON.stringify(freePayload),
                                            signal: this.abortController?.signal
                                        });
                                        
                                        if (!retryResponse.ok) {
                                            throw new Error('Free model retry failed');
                                        }
                                        
                                        const retryReader = retryResponse.body?.getReader();
                                        if (retryReader) {
                                            await this.processResponseStream(retryReader, listener, freePayload);
                                            return;
                                        }
                                    } catch (retryError) {
                                        console.error('Error with free model retry:', retryError);
                                        // Fall back to simulation
                                        await this.simulateResponse(payload.messages, payload, listener);
                                        return;
                                    }
                                }
                                
                                // If we get here, fall back to simulation
                                await this.simulateResponse(payload.messages, payload, listener);
                                return;
                            }
                            
                            if (errorLine.includes('"error"')) {
                                // Extract a clean version of the error text - avoid duplicates
                                const errorText = errorLine;
                                const formattedErrorMsg = `Error in API response: ${errorText}`;
                                
                                // Write error to editor
                                if (window.agentzero && typeof window.agentzero.writeToEditor === 'function') {
                                    window.agentzero.writeToEditor(formattedErrorMsg, {
                                        append: false,
                                        typing: false,
                                        highlight: false
                                    });
                                }
                                
                                if (listener?.onMessage) {
                                    const message: AiMessage = {
                                        role: 'assistant',
                                        content: formattedErrorMsg,
                                        index: messageIndex++,
                                        status: 2 // Final message (error)
                                    };
                                    
                                    listener.onMessage(message);
                                }
                                
                                return; // Stop processing after error
                            }
                        } catch (innerError) {
                            console.error('Error handling malformed response:', innerError);
                        }
                    }
                }
            }
        }
        
        // Send final message with status 2
        if (listener?.onMessage) {
            const finalMessage: AiMessage = {
                role: 'assistant',
                content: '',
                index: messageIndex,
                status: 2
            };
            listener.onMessage(finalMessage);
        }
        
        // Save complete response to memory if applicable
        if (fullContent && this.options.memory !== false) {
            try {
                // Create memory item for the full response
                const memoryItem: MemoryItem = {
                    content: fullContent,
                    timestamp: new Date(),
                    id: `mem-${Date.now()}`,
                    tags: ['response']
                };
                
                // Add to memory and save
                this.memory.push(memoryItem);
                this.saveMemory();
                console.log('Response saved to memory:', memoryItem);
            } catch (error) {
                console.error('Error saving response to memory:', error);
            }
        }
    }
    
    /**
     * Simulate a response for development
     */
    private async simulateResponse(messages: any[], options: any, listener: AiMessageListener | null): Promise<void> {
        // Get the last user message
        const lastMessage = messages[messages.length - 1];
        const content = typeof lastMessage === 'string' ? lastMessage : lastMessage.content;
        let messageIndex = 0;
        
        // Check if there's a tool request in the content
        const toolMatch = /\[tool:([a-z]+)\](.*?)\[\/tool\]/s.exec(content as string);
        if (toolMatch) {
            const toolName = toolMatch[1];
            const toolContent = toolMatch[2].trim();
            
            // Handle different tools
            switch (toolName) {
                case 'search':
                    await this.handleSearchTool(toolContent, listener, messageIndex);
                    break;
                case 'code':
                    await this.handleCodeTool(toolContent, listener, messageIndex);
                    break;
                case 'terminal':
                    await this.handleTerminalTool(toolContent, listener, messageIndex);
                    break;
                case 'memory':
                    await this.handleMemoryTool(toolContent, listener, messageIndex);
                    break;
                case 'delegate':
                    await this.handleDelegateTool(toolContent, listener, messageIndex);
                    break;
                case 'browser':
                    await this.handleBrowserTool(toolContent, listener, messageIndex);
                    break;
                default:
                    this.sendMessage(`I don't know how to use the tool: ${toolName}`, listener, messageIndex, true);
            }
        } else {
            // Try to extract any tool requests from the content
            const searchTool = /search for ([^.]+)/i.exec(content as string);
            const codeTool = /write (a|some) ([a-z]+) code/i.exec(content as string);
            const memoryTool = /remember that (.*)/i.exec(content as string);
            
            if (searchTool) {
                await this.handleSearchTool(searchTool[1], listener, messageIndex);
            } else if (codeTool) {
                const language = codeTool[2];
                const codeExample = `
// Example ${language} code
function hello() {
    console.log("Hello, world!");
}
`;
                await this.handleCodeTool(`${language}\n${codeExample}`, listener, messageIndex);
            } else if (memoryTool) {
                await this.handleMemoryTool(memoryTool[1], listener, messageIndex);
            } else {
                // Default response
                const response = `I'll help you with: "${content}"

Based on your request, I'll assist you step by step. Let me know if you'd like me to use any specific tools like searching the web, executing code, or saving information to memory.

What specific aspect would you like me to help with first?`;
                
                // Send the response word by word for a realistic streaming effect
                const words = response.split(' ');
                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    const isFirst = i === 0;
                    const isLast = i === words.length - 1;
                    const status = isFirst ? 0 : (isLast ? 2 : 1);
                    
                    if (listener?.onMessage) {
                        const message: AiMessage = {
                            role: 'assistant',
                            content: word + ' ',
                            index: messageIndex++,
                            status: status
                        };
                        listener.onMessage(message);
                    }
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
        }
    }
    
    /**
     * Helper function to send formatted messages
     */
    private sendMessage(content: string, listener: AiMessageListener | null, messageIndex: number, isLast: boolean = false): void {
        if (listener?.onMessage) {
            const message: AiMessage = {
                role: 'assistant',
                content: content,
                index: messageIndex,
                status: isLast ? 2 : 1
            };
            listener.onMessage(message);
        }
    }
    
    /**
     * Handle the search tool
     */
    private async handleSearchTool(query: string, listener: AiMessageListener | null, messageIndex: number): Promise<void> {
        this.sendMessage(`Searching for: ${query}\n\n`, listener, messageIndex++);
        
        // Simulate a search delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Example search results
        const results = [
            {
                title: `${query} - Wikipedia`,
                snippet: `This is a comprehensive overview of ${query} including history, applications, and recent developments.`,
                url: `https://en.wikipedia.org/wiki/${query.replace(/ /g, '_')}`
            },
            {
                title: `Latest Research on ${query}`,
                snippet: `New studies have shown significant advances in ${query} during the past year, with implications for future development.`,
                url: `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`
            },
            {
                title: `Understanding ${query}: A Complete Guide`,
                snippet: `This guide explains ${query} in simple terms with practical examples and applications for beginners and experts.`,
                url: `https://example.com/guide/${encodeURIComponent(query)}`
            }
        ];
        
        // Format and send the results
        let response = `Here are the search results for "${query}":\n\n`;
        
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            response += `${i + 1}. **${result.title}**\n`;
            response += `   ${result.snippet}\n`;
            response += `   URL: ${result.url}\n\n`;
            
            this.sendMessage(response, listener, messageIndex++);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        response += `\nBased on these results, I can provide you with a summary of key information about ${query}. Would you like me to do that?`;
        this.sendMessage(response, listener, messageIndex, true);
    }
    
    /**
     * Handle the code tool
     */
    private async handleCodeTool(content: string, listener: AiMessageListener | null, messageIndex: number): Promise<void> {
        // Extract language and code
        const lines = content.split('\n');
        const language = lines[0].trim().toLowerCase();
        const code = lines.slice(1).join('\n');
        
        this.sendMessage(`Executing ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`, listener, messageIndex++);
        
        // Simulate execution delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simple code execution for JavaScript (purely for simulation)
        if (language === 'javascript' || language === 'js') {
            try {
                // Create a sandboxed function
                const sandbox = new Function('code', `
                    try {
                        // Capture console.log output
                        const originalLog = console.log;
                        let output = [];
                        console.log = (...args) => {
                            output.push(args.join(' '));
                            originalLog(...args);
                        };
                        
                        // Execute the code
                        eval(code);
                        
                        // Restore console.log
                        console.log = originalLog;
                        
                        return { success: true, output };
                    } catch (error) {
                        return { success: false, error: error.toString() };
                    }
                `);
                
                const result = sandbox(code);
                
                if (result.success) {
                    const output = result.output.length > 0 
                        ? `Output:\n\`\`\`\n${result.output.join('\n')}\n\`\`\``
                        : 'The code executed successfully without any output.';
                    
                    this.sendMessage(`${output}\n\nThe code executed successfully.`, listener, messageIndex, true);
                } else {
                    this.sendMessage(`Error executing the code: ${result.error}`, listener, messageIndex, true);
                }
            } catch (error) {
                this.sendMessage(`Error executing the code: ${error instanceof Error ? error.message : String(error)}`, listener, messageIndex, true);
            }
        } else {
            // For other languages, just simulate an execution
            this.sendMessage(`Simulated execution of ${language} code. In a real environment, this would execute the code and return the result.`, listener, messageIndex, true);
        }
    }
    
    /**
     * Handle the terminal tool
     */
    private async handleTerminalTool(command: string, listener: AiMessageListener | null, messageIndex: number): Promise<void> {
        this.sendMessage(`Executing command: ${command}\n\n`, listener, messageIndex++);
        
        // Simulate execution delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Simulate common commands
        if (command.startsWith('ls') || command.startsWith('dir')) {
            this.sendMessage(`Output:\n\`\`\`\ndocuments/\nimages/\nprojects/\nREADME.md\nsetup.sh\n\`\`\``, listener, messageIndex, true);
        } else if (command.startsWith('echo')) {
            const output = command.substring(5);
            this.sendMessage(`Output:\n\`\`\`\n${output}\n\`\`\``, listener, messageIndex, true);
        } else if (command.startsWith('cat') || command.startsWith('type')) {
            const filename = command.split(' ')[1];
            this.sendMessage(`Output:\n\`\`\`\nContents of ${filename}...\nThis is a simulated file content.\nThe actual command would show the real file contents.\n\`\`\``, listener, messageIndex, true);
        } else {
            this.sendMessage(`This is a simulated terminal. The command "${command}" would be executed in a real environment.`, listener, messageIndex, true);
        }
    }
    
    /**
     * Handle the memory tool
     */
    private async handleMemoryTool(content: string, listener: AiMessageListener | null, messageIndex: number): Promise<void> {
        // Extract tags if present
        const tags = this.extractTags(content);
        
        // Create a memory item
        const memoryItem: MemoryItem = {
            content,
            timestamp: new Date(),
            id: `mem-${Date.now()}`,
            tags
        };
        
        // Add to memory
        this.memory.push(memoryItem);
        
        // Save to localStorage
        this.saveMemory();
        
        this.sendMessage(`I've saved this to my memory: "${content}"`, listener, messageIndex++);
        
        if (tags.length > 0) {
            this.sendMessage(`\nTags: ${tags.map(tag => `#${tag}`).join(' ')}`, listener, messageIndex, true);
        } else {
            // Send a final empty message with status 2 if no tags
            this.sendMessage('', listener, messageIndex, true);
        }
    }
    
    /**
     * Handle the delegate tool
     */
    private async handleDelegateTool(content: string, listener: AiMessageListener | null, messageIndex: number): Promise<void> {
        // Format of content: "agent:task"
        const parts = content.split(':');
        const agent = parts[0].trim();
        const task = parts.slice(1).join(':').trim();
        
        if (!agent || !task) {
            this.sendMessage(`To delegate a task, please specify both an agent and a task.`, listener, messageIndex, true);
            return;
        }
        
        // Add to sub-agents if new
        if (!this.subAgents.has(agent)) {
            this.subAgents.add(agent);
        }
        
        this.sendMessage(`Delegating task to ${agent}:\n"${task}"\n\n`, listener, messageIndex++);
        
        // Simulate the delegation delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate the sub-agent's response
        this.sendMessage(`Agent ${agent} is working on: "${task}"\n\n`, listener, messageIndex++);
        
        // Simulate more processing time
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Provide a simulated result
        this.sendMessage(`Agent ${agent} has completed the task and reports:\n\nI've analyzed "${task}" and prepared a response. The task has been completed successfully. Here are the key points:\n\n1. Analyzed the requirements\n2. Executed the necessary steps\n3. Prepared the results\n\nWould you like me to explain the details or would you prefer a summary?`, listener, messageIndex, true);
    }
    
    /**
     * Handle the browser tool
     */
    private async handleBrowserTool(content: string, listener: AiMessageListener | null, messageIndex: number): Promise<void> {
        // Try to extract URL from content
        const urlMatch = /https?:\/\/[^\s]+/g.exec(content);
        let url = urlMatch ? urlMatch[0] : null;
        
        if (!url) {
            // Try to find a URL description
            const urlDescMatch = /(visit|browse|go to|navigate to|open) ([^.,]+)/i.exec(content);
            if (urlDescMatch) {
                url = `https://www.${urlDescMatch[2].trim().replace(/\s+/g, '')}.com`;
            }
        }
        
        if (!url) {
            this.sendMessage(`I couldn't find a valid URL in your request. Please provide a specific website to visit.`, listener, messageIndex, true);
            return;
        }
        
        this.sendMessage(`Browsing to: ${url}\n\n`, listener, messageIndex++);
        
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simulate browser navigation
        this.sendMessage(`I've navigated to ${url}. The page has loaded successfully.\n\n`, listener, messageIndex++);
        
        // Simulate content extraction
        this.sendMessage(`Here's a summary of the content I found:\n\n`, listener, messageIndex++);
        
        // Simulate different websites based on the URL
        if (url.includes('wikipedia')) {
            this.sendMessage(`This appears to be a Wikipedia article. The page contains:\n\n- A main header section with overview information\n- Table of contents with multiple sections\n- Several paragraphs of text explaining the topic\n- Images and diagrams illustrating key concepts\n- References and external links at the bottom\n\nWould you like me to extract specific information from this page?`, listener, messageIndex, true);
        } else if (url.includes('github')) {
            this.sendMessage(`This appears to be a GitHub repository. The page contains:\n\n- Repository name and description\n- README file with documentation\n- File structure and code listings\n- Commit history and contributor information\n- Issues and pull requests\n\nWould you like me to extract specific information from this repository?`, listener, messageIndex, true);
        } else {
            this.sendMessage(`The page contains various sections including headers, paragraphs of text, and some images. I can see navigation menus and what appears to be the main content section.\n\nWould you like me to extract specific information from this page?`, listener, messageIndex, true);
        }
    }
    
    /**
     * Extract hashtags from content
     */
    private extractTags(content: string): string[] {
        // Extract hashtags from the content
        const hashtagRegex = /#[a-zA-Z0-9_]+/g;
        const hashtags = content.match(hashtagRegex) || [];
        
        // Clean the hashtags
        return hashtags.map(tag => tag.substring(1));
    }
    
    /**
     * Save memory to localStorage
     */
    private saveMemory(): void {
        try {
            const memoryString = JSON.stringify(this.memory);
            localStorage.setItem('agentZeroMemory', memoryString);
            console.log(`Memory saved to localStorage: ${this.memory.length} items`, this.memory);
        } catch (error) {
            console.error('Error saving memory:', error);
        }
    }
    
    /**
     * Load memory from localStorage
     */
    private loadMemory(): void {
        try {
            const savedMemory = localStorage.getItem('agentZeroMemory');
            if (savedMemory) {
                this.memory = JSON.parse(savedMemory);
                
                // Convert string dates back to Date objects
                this.memory.forEach(item => {
                    item.timestamp = new Date(item.timestamp);
                });
                console.log(`Memory loaded from localStorage: ${this.memory.length} items`, this.memory);
            } else {
                console.log('No memory found in localStorage');
            }
        } catch (error) {
            console.error('Error loading memory:', error);
            this.memory = [];
        }
    }
    
    /**
     * Check for tool usage in messages
     */
    private checkForToolUsage(message: string, listener: AiMessageListener | null): void {
        // Check for tool usage patterns
        const toolPattern = /\[tool:([a-z]+)\](.*?)\[\/tool\]/s;
        const match = toolPattern.exec(message);
        
        if (match) {
            const toolName = match[1];
            const toolContent = match[2].trim();
            
            // Start from a high messageIndex to ensure it's displayed after current messages
            const messageIndex = 1000;
            
            // Handle the tool request
            switch (toolName) {
                case 'search':
                    this.handleSearchTool(toolContent, listener, messageIndex);
                    break;
                case 'code':
                    this.handleCodeTool(toolContent, listener, messageIndex);
                    break;
                case 'terminal':
                    this.handleTerminalTool(toolContent, listener, messageIndex);
                    break;
                case 'memory':
                    this.handleMemoryTool(toolContent, listener, messageIndex);
                    break;
                case 'delegate':
                    this.handleDelegateTool(toolContent, listener, messageIndex);
                    break;
                case 'browser':
                    this.handleBrowserTool(toolContent, listener, messageIndex);
                    break;
            }
        }
    }
} 