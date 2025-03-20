import { Extension } from '@tiptap/core';
import { AiModelManager } from '../ai/AiModelManager.ts';
import { DefaultAiMessageListener } from '../ai/core/DefaultAiMessageListener.ts';
import { AgentZeroPanel } from '../components/AgentZeroPanel.ts';
import { InnerEditor } from '../core/AiEditor.ts';

export interface AgentZeroOptions {
  // Agent Zero configuration options
  memory: boolean;
  toolUsage: boolean;
  multiAgent: boolean;
  browserAgent: boolean;
  customPrompts: Record<string, string>;
  apiKey?: string;
  endpoint?: string;
}

export interface MemoryItem {
  content: string;
  timestamp: Date;
  id: string;
  tags?: string[];
  agentId: string;
}

export interface Agent {
  id: string;
  memory: MemoryItem[] | null;
  createdAt: Date;
  subordinates: string[];
  superior: string | null;
  status: 'idle' | 'working' | 'done' | 'error';
}

export const defaultAgentZeroOptions: AgentZeroOptions = {
  memory: true,
  toolUsage: true,
  multiAgent: true,
  browserAgent: false,
  customPrompts: {
    system: 'You are Agent Zero, a helpful AI assistant with agentic capabilities. You can use tools, create and execute plans, and collaborate with other agents to accomplish tasks.',
    user: 'I need help with: {content}',
  },
};

export class AgentZeroManager {
  private editor: InnerEditor;
  private options: AgentZeroOptions;
  private agents: Map<string, Agent> = new Map();
  private activeAgentId: string = 'main';
  private toolHistory: any[] = [];
  private panel: AgentZeroPanel | null = null;
  
  constructor(editor: InnerEditor, options: Partial<AgentZeroOptions> = {}) {
    this.editor = editor;
    this.options = { ...defaultAgentZeroOptions, ...options };
    
    // Initialize the main agent
    this.createAgent('main');
    
    // Load memory from localStorage
    this.loadMemory();
  }

  /**
   * Set the UI panel associated with this manager
   */
  setPanel(panel: AgentZeroPanel) {
    this.panel = panel;
  }
  
  /**
   * Creates a new agent with the given ID
   */
  createAgent(agentId: string): string {
    this.agents.set(agentId, {
      id: agentId,
      memory: this.options.memory ? [] : null,
      createdAt: new Date(),
      subordinates: [],
      superior: agentId === 'main' ? null : 'main',
      status: 'idle'
    });
    
    return agentId;
  }
  
  /**
   * Gets an agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }
  
  /**
   * Gets all agents
   */
  getAllAgents(): Map<string, Agent> {
    return this.agents;
  }
  
  /**
   * Sets the active agent
   */
  setActiveAgent(agentId: string) {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent with ID ${agentId} does not exist`);
    }
    
    this.activeAgentId = agentId;
    return this;
  }
  
  /**
   * Gets the active agent
   */
  getActiveAgent(): Agent | undefined {
    return this.agents.get(this.activeAgentId);
  }
  
  /**
   * Updates an agent's status
   */
  updateAgentStatus(agentId: string, status: 'idle' | 'working' | 'done' | 'error') {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
    }
  }
  
  /**
   * Adds an item to the tool history
   */
  addToolHistory(agentId: string, action: string, content: string) {
    const historyItem = {
      timestamp: new Date(),
      agentId,
      action,
      content
    };
    
    this.toolHistory.push(historyItem);
    return historyItem;
  }
  
  /**
   * Gets the tool history
   */
  getToolHistory(): any[] {
    return this.toolHistory;
  }
  
  /**
   * Executes a task with the active agent
   */
  executeTask(task: string, listener?: DefaultAiMessageListener) {
    const agent = this.getActiveAgent();
    if (!agent) {
      throw new Error('No active agent');
    }
    
    // Update agent status
    this.updateAgentStatus(agent.id, 'working');
    
    // Add to tool history
    this.addToolHistory(agent.id, 'task', task);
    
    // Create a custom listener that updates agent status and tool history
    const customListener = listener || new DefaultAiMessageListener(this.editor);
    
    const wrappedListener: DefaultAiMessageListener = {
      onStart: () => {
        customListener.onStart?.();
      },
      onMessage: (message: string) => {
        customListener.onMessage?.(message);
        
        // Check for tool usage in the message
        this.checkForToolUsage(message, agent.id);
      },
      onStop: () => {
        customListener.onStop?.();
        
        // Update agent status to done
        this.updateAgentStatus(agent.id, 'done');
      },
      onError: (error: Error) => {
        customListener.onError?.(error);
        
        // Update agent status to error
        this.updateAgentStatus(agent.id, 'error');
      }
    };
    
    // For now, we'll use the existing AI model infrastructure - preferably agentZero model, fallback to openrouter
    const aiModel = AiModelManager.get('agentZero') || AiModelManager.get('openrouter');
    
    // Create a special prompt that instructs the model to use agentic capabilities
    const agentPrompt = this.createAgentPrompt(task);
    
    // Add the task to the agent's memory if enabled
    if (this.options.memory && agent.memory) {
      const memoryItem: MemoryItem = {
        content: task,
        timestamp: new Date(),
        id: `mem-${Date.now()}`,
        agentId: agent.id,
        tags: this.extractTags(task)
      };
      
      agent.memory.push(memoryItem);
      
      // Save memory to localStorage
      this.saveMemory();
    }
    
    // Execute the task
    aiModel.chat('', agentPrompt, wrappedListener);
    
    return this;
  }
  
  /**
   * Creates an agent prompt with the proper instructions
   */
  private createAgentPrompt(task: string): string {
    const agent = this.getActiveAgent();
    
    // Base prompt with system instructions
    let prompt = this.options.customPrompts.system + '\n\n';
    
    // Add memory context if enabled
    if (this.options.memory && agent?.memory?.length) {
      prompt += 'Previous conversation:\n';
      agent.memory.slice(-5).forEach((item: MemoryItem) => {
        prompt += `user: ${item.content}\n`;
      });
      prompt += '\n';
    }
    
    // Add tool usage capabilities if enabled
    if (this.options.toolUsage) {
      prompt += 'You have access to the following tools:\n';
      prompt += '1. search - Search the web for information\n';
      prompt += '2. code - Write and execute code\n';
      prompt += '3. terminal - Execute terminal commands\n';
      prompt += '4. memory - Save information to your memory\n';
      
      if (this.options.browserAgent) {
        prompt += '5. browser - Use a browser to navigate websites\n';
      }
      
      prompt += '\nTo use a tool, respond with: [tool:tool_name] Your input [/tool]\n\n';
    }
    
    // Add multi-agent capabilities if enabled
    if (this.options.multiAgent) {
      prompt += 'You can delegate tasks to other agents by responding with: [tool:delegate] Task description [/tool]\n\n';
    }
    
    // Add the user task using the user prompt template
    prompt += this.options.customPrompts.user.replace('{content}', task);
    
    return prompt;
  }
  
  /**
   * Add a memory item
   */
  addMemory(content: string, agentId?: string): MemoryItem {
    const targetAgentId = agentId || this.activeAgentId;
    const agent = this.agents.get(targetAgentId);
    
    if (!agent) {
      throw new Error(`Agent with ID ${targetAgentId} does not exist`);
    }
    
    if (!this.options.memory || !agent.memory) {
      throw new Error('Memory is not enabled for this agent');
    }
    
    const memoryItem: MemoryItem = {
      content,
      timestamp: new Date(),
      id: `mem-${Date.now()}`,
      agentId: targetAgentId,
      tags: this.extractTags(content)
    };
    
    agent.memory.push(memoryItem);
    
    // Save memory to localStorage
    this.saveMemory();
    
    return memoryItem;
  }
  
  /**
   * Get all memory items across all agents
   */
  getAllMemory(): MemoryItem[] {
    const allMemory: MemoryItem[] = [];
    
    this.agents.forEach(agent => {
      if (agent.memory) {
        allMemory.push(...agent.memory);
      }
    });
    
    return allMemory;
  }
  
  /**
   * Clear all memory
   */
  clearMemory() {
    this.agents.forEach(agent => {
      if (agent.memory) {
        agent.memory = [];
      }
    });
    
    // Clear localStorage
    localStorage.removeItem('agentZeroMemory');
  }
  
  /**
   * Extracts hashtags from content
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
  private saveMemory() {
    try {
      const allMemory = this.getAllMemory();
      localStorage.setItem('agentZeroMemory', JSON.stringify(allMemory));
    } catch (error) {
      console.error('Error saving memory:', error);
    }
  }
  
  /**
   * Load memory from localStorage
   */
  private loadMemory() {
    try {
      const savedMemory = localStorage.getItem('agentZeroMemory');
      if (savedMemory) {
        const memoryItems: MemoryItem[] = JSON.parse(savedMemory);
        
        // Convert string dates back to Date objects
        memoryItems.forEach(item => {
          item.timestamp = new Date(item.timestamp);
          
          // Add to the appropriate agent
          const agentId = item.agentId || 'main';
          let agent = this.agents.get(agentId);
          
          // Create the agent if it doesn't exist
          if (!agent) {
            this.createAgent(agentId);
            agent = this.agents.get(agentId);
          }
          
          // Add to agent's memory
          if (agent && agent.memory) {
            agent.memory.push(item);
          }
        });
      }
    } catch (error) {
      console.error('Error loading memory:', error);
    }
  }
  
  /**
   * Check for tool usage in a message
   */
  private checkForToolUsage(message: string, agentId: string) {
    // Check for tool usage patterns
    const toolPattern = /\[tool:([a-z]+)\](.*?)\[\/tool\]/s;
    const match = toolPattern.exec(message);
    
    if (match) {
      const toolName = match[1];
      const toolContent = match[2].trim();
      
      // Add to tool history
      this.addToolHistory(agentId, toolName, toolContent);
    }
  }
}

export const AgentZeroExt = Extension.create<{
  options: Partial<AgentZeroOptions>,
}>({
  name: 'agentZero',
  
  addOptions() {
    return {
      options: defaultAgentZeroOptions,
    };
  },
  
  onBeforeCreate() {
    try {
      // Initialize Agent Zero when the extension is created
      this.storage.agentZero = new AgentZeroManager(
        this.editor as InnerEditor, 
        this.options.options
      );
      console.log('AgentZero extension initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AgentZero extension:', error);
      // Create a minimal stub implementation instead of null
      this.storage.agentZero = {
        getAllAgents: () => new Map(),
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
        createAgent: (agentId) => {
          console.log(`Stub createAgent called for ${agentId}`);
          return agentId;
        },
        setActiveAgent: (agentId) => {
          console.log(`Stub setActiveAgent called for ${agentId}`);
          return this.storage.agentZero;
        },
        addMemory: (content, agentId) => {
          console.log(`Stub addMemory called: ${content} for agent ${agentId || 'main'}`);
          return {
            id: `mem_${Date.now()}`,
            content,
            timestamp: new Date(),
            agentId: agentId || 'main',
            tags: []
          };
        },
        setPanel: (panel) => {
          console.log('Stub setPanel called');
        },
        clearMemory: () => {
          console.log('Stub clearMemory called');
          return true;
        },
        executeTask: (task) => {
          console.log(`Stub executeTask called: ${task}`);
          return this.storage.agentZero;
        },
        stopAgentTask: () => {
          console.log('Stub stopAgentTask called');
          return true;
        }
      };
      console.log('AgentZero extension initialized with stub implementation');
    }
  },
  
  addStorage() {
    return {
      agentZero: null as AgentZeroManager | null,
    };
  },
  
  addCommands() {
    return {
      executeAgentTask: (task: string) => ({ chain }) => {
        try {
          if (this.storage.agentZero) {
            this.storage.agentZero.executeTask(task);
            return true;
          }
          console.warn('Cannot execute task: AgentZero not initialized');
          return false;
        } catch (error) {
          console.error('Error executing task:', error);
          return false;
        }
      },
      
      setActiveAgent: (agentId: string) => ({ chain }) => {
        try {
          if (this.storage.agentZero) {
            this.storage.agentZero.setActiveAgent(agentId);
            return true;
          }
          console.warn('Cannot set active agent: AgentZero not initialized');
          return false;
        } catch (error) {
          console.error('Error setting active agent:', error);
          return false;
        }
      },
      
      createSubAgent: (agentId: string) => ({ chain }) => {
        try {
          if (this.storage.agentZero) {
            this.storage.agentZero.createAgent(agentId);
            return true;
          }
          console.warn('Cannot create sub-agent: AgentZero not initialized');
          return false;
        } catch (error) {
          console.error('Error creating sub-agent:', error);
          return false;
        }
      },
      
      addAgentMemory: (content: string, agentId?: string) => ({ chain }) => {
        const agentZero = this.storage.agentZero;
        if (!agentZero) return false;
        
        agentZero.addMemory(content, agentId);
        return true;
      },
      
      clearAgentMemory: () => ({ chain }) => {
        try {
          // Clear memory logic would go here
          return true;
        } catch (error) {
          console.error('Error clearing agent memory:', error);
          return false;
        }
      },
      
      stopAgentTask: () => ({ chain }) => {
        try {
          const agentZero = this.storage.agentZero;
          if (!agentZero) {
            console.warn('Cannot stop task: AgentZero not initialized');
            return false;
          }
          
          // Update the active agent status to idle
          const activeAgent = agentZero.getActiveAgent();
          if (activeAgent) {
            agentZero.updateAgentStatus(activeAgent.id, 'idle');
          }
          
          console.log('Agent task stopped');
          return true;
        } catch (error) {
          console.error('Error stopping agent task:', error);
          return false;
        }
      },
      
      setAgentPanel: (panel: any) => ({ chain }) => {
        try {
          if (this.storage.agentZero) {
            this.storage.agentZero.setPanel(panel);
            return true;
          }
          console.warn('Cannot set agent panel: AgentZero not initialized');
          return false;
        } catch (error) {
          console.error('Error setting agent panel:', error);
          return false;
        }
      },
      
      updateAgentStatus: (agentId: string, status: 'idle' | 'working' | 'done' | 'error') => ({ chain }) => {
        const agentZero = this.storage.agentZero;
        if (!agentZero) return false;
        
        agentZero.updateAgentStatus(agentId, status);
        return true;
      },
    };
  },
}); 