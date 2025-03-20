import { InnerEditor } from "../core/AiEditor.ts";
import { Agent, MemoryItem } from "../extensions/AgentZeroExt.ts";

// Custom type for agent status
type AgentStatus = "error" | "idle" | "working" | "done";

export class AgentZeroPanel extends HTMLElement {
    private editor!: InnerEditor; // Using the definite assignment assertion
    private shadow: ShadowRoot;
    private agents: Map<string, Agent> = new Map();
    private activeAgentId: string = 'main';
    private memory: MemoryItem[] = [];
    private isOpen: boolean = false;
    private toolHistory: any[] = [];
    private _eventListeners: { type: string, callback: EventListenerOrEventListenerObject }[] = [];
    private _initialized: boolean = false;
    private _mountPoint: string = '#agent-zero-panel';
    private _storage: any = null;
    private _animationInterval: ReturnType<typeof setInterval> | null = null;
    private _isEditorFullscreen: boolean = false;

    constructor(options?: { editor?: InnerEditor, mountPoint?: string, storage?: any }) {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        
        // Handle constructor options if provided
        if (options) {
            if (options.editor) this.editor = options.editor;
            if (options.mountPoint) this._mountPoint = options.mountPoint;
            if (options.storage) this._storage = options.storage;
        }
        
        this.render();
        
        // If editor is already provided in constructor, initialize
        if (this.editor) {
            this.init(this.editor);
        }
        
        // Listen for fullscreen changes globally
        this.setupFullscreenListeners();
    }

    // Add event listener with tracking for cleanup
    on(type: string, callback: EventListenerOrEventListenerObject) {
        this.addEventListener(type, callback);
        this._eventListeners.push({ type, callback });
        return this;
    }

    // Initialize method to be called from main.ts
    initialize() {
        console.log('AgentZeroPanel initialize called');
        
        if (!this.editor) {
            console.error('Cannot initialize AgentZeroPanel: No editor instance provided');
            throw new Error('Editor instance is required for initialization');
        }
        
        if (this._initialized) {
            console.log('AgentZeroPanel already initialized');
            return;
        }
        
        // Find mount point and append panel if needed
        let container = document.querySelector(this._mountPoint);
        if (!container) {
            console.log(`Mount point ${this._mountPoint} not found, creating a container`);
            container = document.createElement('div');
            container.id = this._mountPoint.replace('#', '');
            document.body.appendChild(container);
        }
        
        // Append panel to container if not already a child
        if (!container.contains(this)) {
            console.log('Attaching panel to container');
            container.appendChild(this);
        }
        
        // Initialize the panel
        this.init(this.editor);
        
        // Dispatch mount event
        this.dispatchEvent(new CustomEvent('mount'));
        
        this._initialized = true;
        console.log('AgentZeroPanel successfully initialized');
    }

    connectedCallback() {
        this.setupEventListeners();
    }

    disconnectedCallback() {
        // Clean up event listeners
        this._eventListeners.forEach(({ type, callback }) => {
            this.removeEventListener(type, callback);
        });
        this._eventListeners = [];
    }

    /**
     * Initialize the panel with an editor instance
     */
    init(editor: InnerEditor) {
        console.log('AgentZeroPanel init called with editor:', editor);
        
        if (!editor) {
            console.error('Editor not provided to AgentZeroPanel.init');
            this.renderError('Editor not available');
            return;
        }
        
        this.editor = editor;
        
        try {
            // Check if storage exists
            if (!this.editor.storage) {
                console.warn('Editor storage is undefined. Cannot access AgentZero extension.');
                this.renderError('Editor storage not available');
                return;
            }
            
            // Check if AgentZero extension is initialized
            if (!this.editor.storage.agentZero) {
                console.warn('AgentZero extension not initialized. Please ensure it is properly registered in getExtensions.ts');
                
                // Try to create a stub implementation to allow basic UI rendering
                try {
                    if (typeof window.createAgentZeroCompatibilityAdapter === 'function') {
                        console.log('Creating compatibility adapter for missing AgentZero extension');
                        this.editor.storage.agentZero = window.createAgentZeroCompatibilityAdapter(this.editor);
                    } else {
                        // Create a minimal stub if the compatibility adapter function isn't available
                        console.log('Creating minimal stub for AgentZero extension');
                        this.editor.storage.agentZero = {
                            getAllAgents: () => new Map(),
                            getActiveAgent: () => ({ id: 'main', memory: [], createdAt: new Date(), subordinates: [], superior: null, status: 'idle' }),
                            getAllMemory: () => [],
                            getToolHistory: () => []
                        };
                    }
                } catch (stubError) {
                    console.error('Error creating AgentZero stub:', stubError);
                    this.renderError('AgentZero extension not available');
                return;
                }
            }
            
            // Check if setAgentPanel command exists before using it
            if (typeof this.editor.commands?.setAgentPanel === 'function') {
                // Register this panel with the Agent Zero extension
                try {
                this.editor.commands.setAgentPanel(this);
                    console.log('Panel registered with AgentZero extension');
                } catch (cmdError) {
                    console.warn('Error calling setAgentPanel command:', cmdError);
                }
            } else {
                console.warn('setAgentPanel command not found. Check if AgentZero extension is properly registered.');
            }
            
            // Continue with other initialization steps, even if the command is missing
            try {
            // Sync the agents from the extension
            this.syncAgentsFromExtension();
            
            // Sync memory
            this.syncMemoryFromExtension();
            
            // Sync tool history
            this.syncToolHistoryFromExtension();
            
            // Update UI
            this.render();
                
                // Mark as initialized
                this._initialized = true;
                this.dispatchEvent(new CustomEvent('initialized'));
                console.log('AgentZeroPanel initialization complete');
            } catch (syncError) {
                console.error('Error during panel data synchronization:', syncError);
                this.renderError('Error initializing panel data');
            }
        } catch (error) {
            console.error('Error initializing AgentZeroPanel:', error);
            this.renderError('Initialization error');
        }
    }
    
    /**
     * Sync agents from the Agent Zero extension
     */
    private syncAgentsFromExtension() {
        try {
            // Get the agent zero storage from the editor
            const agentZero = this.editor.storage.agentZero;
            if (!agentZero) {
                console.warn('AgentZero not found in editor storage');
                // Create default main agent if not found
                this.createDefaultMainAgent();
                return;
            }
            
            // Check if the method exists
            if (typeof agentZero.getAllAgents !== 'function') {
                console.warn('agentZero.getAllAgents is not a function - creating compatibility layer');
                
                // Create a compatibility layer
                this.createCompatibilityLayer();
                
                // Create default main agent
                this.createDefaultMainAgent();
                return;
            }
            
            try {
                this.agents = agentZero.getAllAgents();
                
                // If agents map is empty or main agent doesn't exist, create it
                if (this.agents.size === 0 || !this.agents.has('main')) {
                    console.warn('Main agent not found in agents map, creating default');
                    this.createDefaultMainAgent();
                }
            } catch (methodError) {
                console.error('Error calling getAllAgents', methodError);
                this.createDefaultMainAgent();
            }
            
            // Get active agent with additional error handling
            try {
                const activeAgent = agentZero.getActiveAgent?.();
                this.activeAgentId = activeAgent?.id || 'main';
            } catch (activeError) {
                console.warn('Error getting active agent', activeError);
                this.activeAgentId = 'main';
            }
            
            this.updateAgentList();
        } catch (error) {
            console.error('Error syncing agents:', error);
            // Set up fallback agent for UI
            this.createDefaultMainAgent();
            this.updateAgentList();
        }
    }
    
    /**
     * Helper method to create a default main agent
     */
    private createDefaultMainAgent() {
        // Call our more robust createDefaultAgent method
        this.createDefaultAgent('main');
        
        // Set active agent ID
        this.activeAgentId = 'main';
    }
    
    /**
     * Creates a compatibility layer for missing AgentZero functions
     */
    private createCompatibilityLayer() {
        console.log('Setting up compatibility layer for AgentZero extension');
        
        // First, ensure we have storage objects properly initialized
        try {
            if (!this.editor.storage) {
                // Can't directly assign to read-only property, use an alternative approach
                console.warn('Editor storage not available, using local fallback storage');
                this._storage = this._storage || {
                    agents: new Map<string, any>(),
                    memory: [],
                    toolHistory: []
                };
                
                // Create a proxy for editor.storage
                const localAgentZero = {
                    getAllAgents: () => this._storage.agents || new Map(),
                    getActiveAgent: () => this._storage.agents.get(this.activeAgentId) || this.createDefaultAgent('main'),
                    getAllMemory: () => this._storage.memory || [],
                    getToolHistory: () => this._storage.toolHistory || [],
                    createAgent: this.createDefaultAgent.bind(this),
                    addMemory: (content: string, agentId: string, tags: string[] = []) => {
                        this._storage.memory = this._storage.memory || [];
                        const memoryItem = {
                            id: `mem_${Date.now()}`,
                            agentId: agentId || 'main',
                            content,
                            timestamp: new Date(),
                            tags: tags || []
                        };
                        this._storage.memory.push(memoryItem);
                        return memoryItem;
                    },
                    clearMemory: () => {
                        this._storage.memory = [];
                        return true;
                    }
                };
                
                // Add to the editor's commands directly since we can't modify storage
                if (this.editor.commands) {
                    this.editor.commands.agentZero = localAgentZero;
                }
                
                return; // Exit here, we're using local storage instead
            }
            
            if (!this.editor.storage.agentZero) {
                this.editor.storage.agentZero = {};
            }
            
            const agentZero = this.editor.storage.agentZero;
            
            // Create a local storage for agent data
            if (!this._storage) {
                this._storage = {
                    agents: new Map<string, any>(),
                    memory: [],
                    toolHistory: []
                };
            }
            
            // Ensure the agents Map exists
            if (!this._storage.agents) {
                this._storage.agents = new Map<string, any>();
            }
            
            // Add missing methods if they don't exist
            if (typeof agentZero.getAllAgents !== 'function') {
                agentZero.getAllAgents = () => {
                    return this._storage.agents || new Map();
                };
            }
            
            if (typeof agentZero.getActiveAgent !== 'function') {
                agentZero.getActiveAgent = () => {
                    if (!this._storage.agents || !this._storage.agents.has(this.activeAgentId)) {
                        // Create the agent if it doesn't exist
                        return this.createDefaultAgent(this.activeAgentId);
                    }
                    return this._storage.agents.get(this.activeAgentId);
                };
            }
            
            if (typeof agentZero.getAllMemory !== 'function') {
                agentZero.getAllMemory = () => {
                    return this._storage.memory || [];
                };
            }
            
            if (typeof agentZero.getToolHistory !== 'function') {
                agentZero.getToolHistory = () => {
                    return this._storage.toolHistory || [];
                };
            }
            
            if (typeof agentZero.createAgent !== 'function') {
                agentZero.createAgent = (agentId: string) => {
                    return this.createDefaultAgent(agentId);
                };
            }
            
            if (typeof agentZero.addMemory !== 'function') {
                agentZero.addMemory = (content: string, agentId: string, tags: string[] = []) => {
                    if (!this._storage) {
                        this._storage = {
                            agents: new Map<string, any>(),
                            memory: [],
                            toolHistory: []
                        };
                    }
                    
                    if (!this._storage.memory) {
                        this._storage.memory = [];
                    }
                    
                    const memoryItem = {
                        id: `mem_${Date.now()}`,
                        agentId: agentId || 'main',
                        content,
                        timestamp: new Date(),
                        tags: tags || []
                    };
                    this._storage.memory.push(memoryItem);
                    return memoryItem;
                };
            }
            
            if (typeof agentZero.clearMemory !== 'function') {
                agentZero.clearMemory = () => {
                    if (this._storage && this._storage.memory) {
                        this._storage.memory = [];
                    }
                    return true;
                };
            }
            
            // Actually create the main agent
            this.createDefaultAgent('main');
            
            console.log('AgentZero compatibility layer created successfully');
            
        } catch (error) {
            console.error('Error creating compatibility layer:', error);
            this.createLocalFallback();
        }
    }
    
    /**
     * Helper method to create a default agent with the specified ID
     */
    private createDefaultAgent(agentId: string) {
        try {
            // Initialize storage if needed
            if (!this._storage) {
                this._storage = {
                    agents: new Map<string, any>(),
                    memory: [],
                    toolHistory: []
                };
            }
            
            // Initialize agents map if needed
            if (!this._storage.agents) {
                this._storage.agents = new Map<string, any>();
            }
            
            // Create and add the agent to our local storage
            const agent = {
                id: agentId,
                memory: [],
                createdAt: new Date(),
                subordinates: [],
                superior: null,
                status: 'idle' as AgentStatus
            };
            
            // Store in local storage
            this._storage.agents.set(agentId, agent);
            
            // Also add to the class agents map
            if (!this.agents) {
                this.agents = new Map<string, any>();
            }
            this.agents.set(agentId, agent);
            
            // Update the UI
            this.updateAgentList();
            
            console.log(`Created agent with ID: ${agentId}`);
            return agent;
        } catch (error) {
            console.error(`Error creating agent ${agentId}:`, error);
            // Create a standalone agent that's not tied to any storage
            return {
                id: agentId,
                memory: [],
                createdAt: new Date(),
                subordinates: [],
                superior: null,
                status: 'idle' as AgentStatus
            };
        }
    }
    
    /**
     * Creates a completely local fallback implementation when editor storage is not accessible
     */
    private createLocalFallback() {
        console.log('Creating local fallback for AgentZero functionality');
        
        // Create local storage
        this._storage = {
            agents: new Map<string, any>(),
            memory: [],
            toolHistory: []
        };
        
        // Create the main agent
        this.createDefaultAgent('main');
        
        // Set active agent
        this.activeAgentId = 'main';
        
        console.log('Local fallback created successfully');
    }
    
    /**
     * Sync memory from the Agent Zero extension
     */
    private syncMemoryFromExtension() {
        try {
            // Get the agent zero storage from the editor
            const agentZero = this.editor.storage.agentZero;
            if (!agentZero) {
                console.warn('AgentZero not found in editor storage');
                this.memory = [];
                this.updateMemoryList();
                return;
            }
            
            // Check if the method exists
            if (typeof agentZero.getAllMemory !== 'function') {
                console.warn('agentZero.getAllMemory is not a function - using compatibility layer');
                
                // Create a compatibility layer if not already created
                if (typeof agentZero.getAllAgents !== 'function') {
                    this.createCompatibilityLayer();
                }
                
                // Use our compatibility layer
                this.memory = agentZero.getAllMemory();
                this.updateMemoryList();
                return;
            }
            
            try {
                this.memory = agentZero.getAllMemory();
            } catch (methodError) {
                console.error('Error calling getAllMemory', methodError);
                this.memory = [];
            }
            
            this.updateMemoryList();
        } catch (error) {
            console.error('Error syncing memory:', error);
            this.memory = [];
            this.updateMemoryList();
        }
    }
    
    /**
     * Sync tool history from the Agent Zero extension
     */
    private syncToolHistoryFromExtension() {
        try {
            // Get the agent zero storage from the editor
            const agentZero = this.editor.storage.agentZero;
            if (!agentZero) {
                console.warn('AgentZero not found in editor storage');
                this.toolHistory = [];
                this.updateToolHistory();
                return;
            }
            
            // Check if the method exists
            if (typeof agentZero.getToolHistory !== 'function') {
                console.warn('agentZero.getToolHistory is not a function - using compatibility layer');
                
                // Create a compatibility layer if not already created
                if (typeof agentZero.getAllAgents !== 'function') {
                    this.createCompatibilityLayer();
                }
                
                // Use our compatibility layer
                this.toolHistory = agentZero.getToolHistory();
                this.updateToolHistory();
                return;
            }
            
            try {
                this.toolHistory = agentZero.getToolHistory();
            } catch (methodError) {
                console.error('Error calling getToolHistory', methodError);
                this.toolHistory = [];
            }
            
            this.updateToolHistory();
        } catch (error) {
            console.error('Error syncing tool history:', error);
            this.toolHistory = [];
            this.updateToolHistory();
        }
    }

    private setupEventListeners() {
        // Toggle panel button
        const toggleButton = this.shadow.querySelector('#toggle-panel');
        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                this.togglePanel();
            });
        }

        // Create agent button
        const createAgentButton = this.shadow.querySelector('#create-agent');
        if (createAgentButton) {
            createAgentButton.addEventListener('click', () => {
                this.createNewAgent();
            });
        }

        // Execute task button
        const executeTaskButton = this.shadow.querySelector('#execute-task');
        if (executeTaskButton) {
            executeTaskButton.addEventListener('click', () => {
                this.executeTask();
            });
        }

        // Stop task button
        const stopTaskButton = this.shadow.querySelector('#stop-task');
        if (stopTaskButton) {
            stopTaskButton.addEventListener('click', () => {
                this.stopCurrentTask();
            });
        }

        // Clear memory button
        const clearMemoryButton = this.shadow.querySelector('#clear-memory');
        if (clearMemoryButton) {
            clearMemoryButton.addEventListener('click', () => {
                this.clearMemory();
            });
        }
        
        // Add panel title click handler for revolving animation
        const panelTitle = this.shadow.querySelector('.agent-zero-panel-title');
        if (panelTitle) {
            // Remove the click handler that starts the revolving animation
            // panelTitle.addEventListener('click', () => {
            //     this.startRevolvingAnimation();
            // });
        }
        
        // Set up the writing to editor functionality
        this.addWriteToEditorButton();
    }

    private togglePanel() {
        const panel = this.shadow.querySelector('.agent-zero-panel-content');
        if (panel) {
            this.isOpen = !this.isOpen;
            panel.classList.toggle('open', this.isOpen);
            
            const toggleButton = this.shadow.querySelector('#toggle-panel');
            if (toggleButton) {
                toggleButton.textContent = this.isOpen ? 'Close' : 'Open';
            }
        }
    }

    private createNewAgent() {
        // Get the agent name from the input
        const agentNameInput = this.shadow.querySelector('#agent-name') as HTMLInputElement;
        if (!agentNameInput || !agentNameInput.value.trim()) {
            alert('Please enter a valid agent name');
            return;
        }

        const agentName = agentNameInput.value.trim();
        
        // Execute the createSubAgent command
        if (this.editor) {
            this.editor.commands.createSubAgent(agentName);
            
            // Sync agents from extension
            this.syncAgentsFromExtension();
            
            // Clear the input
            agentNameInput.value = '';
        }
    }

    private executeTask() {
        // Get the task from the input
        const taskInput = this.shadow.querySelector('#task-input') as HTMLInputElement;
        if (!taskInput || !taskInput.value.trim()) {
            alert('Please enter a valid task');
            return;
        }

        const task = taskInput.value.trim();
        console.log(`Executing task: "${task}" for agent: ${this.activeAgentId}`);
        
        // Execute the task using the active agent
        if (this.editor) {
            try {
                // Display visual feedback that task is starting
                const agent = this.agents.get(this.activeAgentId);
                if (agent) {
                    agent.status = 'working' as AgentStatus;
                    this.updateAgentList(); // Refresh UI immediately
                }
                
                // Add to memory that task was started
                if (this.editor?.storage?.agentZero?.addMemory) {
                    this.editor.storage.agentZero.addMemory(`Task started: ${task}`, 
                        this.activeAgentId, ['system', 'task']);
                    console.log(`Task memory added: ${task}`);
                }
                
                // Set active agent and execute task
                if (typeof this.editor.commands?.setActiveAgent === 'function') {
                    this.editor.commands.setActiveAgent(this.activeAgentId);
                    console.log(`Set active agent to: ${this.activeAgentId}`);
                } else {
                    console.warn('setActiveAgent method not found in editor commands');
                }
                
                if (typeof this.editor.commands?.executeAgentTask === 'function') {
                    this.editor.commands.executeAgentTask(task);
                    console.log('executeAgentTask command executed');
                } else {
                    console.warn('executeAgentTask method not found in editor commands');
                    
                    // Fallback - use direct API if available through window.agentzero
                    if (window.agentzero && typeof window.agentzero.write === 'function') {
                        window.agentzero.write(`I'll help you with: ${task}\n\nProcessing your request...`);
                        console.log('Using window.agentzero.write as fallback');
                    }
                }
                
                // Clear the input
                taskInput.value = '';
                
                // Sync with extension after a short delay to allow for updates
                setTimeout(() => {
                    this.syncAgentsFromExtension();
                    this.syncMemoryFromExtension();
                    this.syncToolHistoryFromExtension();
                    console.log('Synchronized data from extension after task execution');
                }, 500);
            } catch (error) {
                console.error('Error executing task:', error);
                alert(`Error executing task: ${error instanceof Error ? error.message : String(error)}`);
                
                // Reset agent status
                const agent = this.agents.get(this.activeAgentId);
                if (agent) {
                    agent.status = 'error' as AgentStatus;
                    this.updateAgentList(); // Refresh UI
                }
            }
        } else {
            console.error('Editor not available for task execution');
            alert('Editor not available. Cannot execute task.');
        }
    }

    private stopCurrentTask() {
        if (this.editor) {
            // Try to use the stopAgentTask command if it exists
            try {
                if (typeof this.editor.commands?.stopAgentTask === 'function') {
                    this.editor.commands.stopAgentTask();
                    console.log('Stopped current agent task');
                } else {
                    // Alternative approach: Send abort signal if available
                    if (window.agentzero && typeof window.agentzero.abortCurrentOperation === 'function') {
                        window.agentzero.abortCurrentOperation();
                        console.log('Aborted current operation via global agentzero');
                    } else {
                        console.warn('No method available to stop the current task');
                    }
                }
                
                // Update agent status to indicate task was stopped
                if (this.agents.has(this.activeAgentId)) {
                    const agent = this.agents.get(this.activeAgentId);
                    if (agent) {
                        agent.status = 'idle' as AgentStatus;
                        this.updateAgentList(); // Refresh UI
                    }
                }
                
                // Add to memory that task was stopped
                try {
                    if (this.editor?.storage?.agentZero?.addMemory) {
                        this.editor.storage.agentZero.addMemory('Task was manually stopped by user', 
                            this.activeAgentId, ['system', 'abort']);
                        // Refresh memory list
                        this.syncMemoryFromExtension();
                    }
                } catch (error) {
                    console.warn('Could not store abort action in agent memory', error);
                }
                
                // Update UI to show task was stopped
                const taskInput = this.shadow.querySelector('#task-input') as HTMLInputElement;
                if (taskInput) {
                    taskInput.placeholder = "Task stopped. Enter new task...";
                    setTimeout(() => {
                        taskInput.placeholder = "Enter task for the agent";
                    }, 3000);
                }
            } catch (error) {
                console.error('Error stopping task:', error);
            }
        }
    }

    private clearMemory() {
        if (confirm('Are you sure you want to clear all memory? This cannot be undone.')) {
            if (this.editor && this.editor.storage && this.editor.storage.agentZero) {
                // Try to use the clearAgentMemory command if it exists
                if (typeof this.editor.commands?.clearAgentMemory === 'function') {
                    this.editor.commands.clearAgentMemory();
                } else if (typeof this.editor.storage.agentZero.clearMemory === 'function') {
                    // Use our compatibility layer if available
                    this.editor.storage.agentZero.clearMemory();
                } else {
                    // Direct manipulation as last resort
                    if (this._storage && this._storage.memory) {
                        this._storage.memory = [];
                    }
                    this.memory = [];
                }
                
                // Sync memory from extension
                this.syncMemoryFromExtension();
            }
        }
    }

    private selectAgent(agentId: string) {
        this.activeAgentId = agentId;
        
        // Set the active agent in the editor
        if (this.editor) {
            this.editor.commands.setActiveAgent(agentId);
            
            // Update the UI
            this.updateAgentList();
        }
    }

    private updateMemoryList() {
        const memoryList = this.shadow.querySelector('#memory-list');
        if (memoryList) {
            memoryList.innerHTML = '';
            
            // Initialize memory array if it's undefined
            if (!this.memory) {
                this.memory = [];
            }
            
            if (this.memory.length === 0) {
                const emptyItem = document.createElement('li');
                emptyItem.className = 'empty-memory';
                emptyItem.textContent = 'No memories stored yet';
                memoryList.appendChild(emptyItem);
                return;
            }
            
            // Sort memory by timestamp (newest first)
            const sortedMemory = [...this.memory].sort((a, b) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            
            for (const item of sortedMemory) {
                const memoryItem = document.createElement('li');
                memoryItem.className = 'memory-item';
                
                const timestamp = new Date(item.timestamp);
                const formattedDate = timestamp.toLocaleString();
                
                memoryItem.innerHTML = `
                    <div class="memory-content">${item.content}</div>
                    <div class="memory-meta">
                        <span class="memory-agent">${item.agentId}</span>
                        <span class="memory-timestamp">${formattedDate}</span>
                        ${item.tags && item.tags.length ? `<span class="memory-tags">${item.tags.map(tag => `#${tag}`).join(' ')}</span>` : ''}
                    </div>
                `;
                
                memoryList.appendChild(memoryItem);
            }
        }
    }

    private updateAgentList() {
        const agentList = this.shadow.querySelector('#agent-list');
        if (agentList) {
            agentList.innerHTML = '';
            
            try {
                // Initialize agents map if it's undefined or empty
                if (!this.agents || this.agents.size === 0) {
                    this.agents = new Map<string, any>();
                    // Create default main agent
                    this.createDefaultMainAgent();
                }
                
                // Always ensure main agent exists
                if (!this.agents.has('main')) {
                    console.warn('Main agent not found, creating default');
                    this.createDefaultMainAgent();
                }
                
                // Sort agents (main first, then alphabetically)
                const sortedAgents = [...this.agents.entries()].sort((a, b) => {
                    if (a[0] === 'main') return -1;
                    if (b[0] === 'main') return 1;
                    return a[0].localeCompare(b[0]);
                });
                
                for (const [agentId, agent] of sortedAgents) {
                    if (!agent) continue; // Skip null/undefined agents
                    
                    const agentItem = document.createElement('li');
                    agentItem.className = `agent-item ${agentId === this.activeAgentId ? 'active' : ''}`;
                    agentItem.dataset.agentId = agentId;
                    
                    // Status class - default to idle if not specified
                    const status = agent.status || 'idle';
                    agentItem.classList.add(`status-${status}`);
                    
                    agentItem.innerHTML = `
                        <div class="agent-name">${agentId}</div>
                        <div class="agent-status">${status}</div>
                    `;
                    
                    agentItem.addEventListener('click', () => {
                        this.selectAgent(agentId);
                    });
                    
                    agentList.appendChild(agentItem);
                }
            } catch (error) {
                console.error('Error updating agent list:', error);
                // Create a fallback UI if there's an error
                const errorItem = document.createElement('li');
                errorItem.className = 'agent-item status-error';
                errorItem.innerHTML = `
                    <div class="agent-name">main (fallback)</div>
                    <div class="agent-status">error</div>
                `;
                agentList.appendChild(errorItem);
            }
        }
    }

    private updateToolHistory() {
        const historyList = this.shadow.querySelector('#tool-history');
        if (historyList) {
            historyList.innerHTML = '';
            
            // Initialize toolHistory array if it's undefined
            if (!this.toolHistory) {
                this.toolHistory = [];
            }
            
            if (this.toolHistory.length === 0) {
                const emptyItem = document.createElement('li');
                emptyItem.className = 'empty-history';
                emptyItem.textContent = 'No tools used yet';
                historyList.appendChild(emptyItem);
                return;
            }
            
            // Sort by timestamp (newest first)
            const sortedHistory = [...this.toolHistory].sort((a, b) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            
            for (const item of sortedHistory.slice(0, 10)) { // Show only the 10 most recent
                const historyItem = document.createElement('li');
                historyItem.className = 'history-item';
                
                const timestamp = new Date(item.timestamp);
                const formattedTime = timestamp.toLocaleTimeString();
                
                historyItem.innerHTML = `
                    <div class="history-content">
                        <span class="history-action">${item.action}</span>
                        <span class="history-text">${item.content.substring(0, 30)}${item.content.length > 30 ? '...' : ''}</span>
                    </div>
                    <div class="history-meta">
                        <span class="history-agent">${item.agentId}</span>
                        <span class="history-timestamp">${formattedTime}</span>
                    </div>
                `;
                
                historyList.appendChild(historyItem);
            }
        }
    }

    private render() {
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                
                @keyframes rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                @keyframes glow {
                    0% { box-shadow: 0 0 5px rgba(3, 102, 214, 0.5); }
                    50% { box-shadow: 0 0 20px rgba(3, 102, 214, 0.8); }
                    100% { box-shadow: 0 0 5px rgba(3, 102, 214, 0.5); }
                }
                
                .agent-zero-panel {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                    z-index: 10000;
                    width: 350px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    border: 1px solid #0366d6;
                    animation: glow 2s infinite ease-in-out;
                }
                
                /* Special styling for fullscreen mode */
                .agent-zero-panel.editor-fullscreen-active {
                    border: 2px solid #0366d6;
                    box-shadow: 0 0 25px rgba(3, 102, 214, 0.9);
                }
                
                .agent-zero-panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: #0366d6;
                    border-bottom: 1px solid #e1e4e8;
                    color: white;
                }
                
                .agent-zero-panel-title {
                    font-weight: 600;
                    font-size: 14px;
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .agent-zero-panel-title svg {
                    animation: rotate 10s linear infinite;
                }
                
                .agent-icon-wrapper {
                    display: inline-flex;
                    animation: pulse 2s infinite ease-in-out;
                }
                
                .agent-zero-panel-content {
                    display: none;
                    flex-direction: column;
                    max-height: 0;
                    transition: max-height 0.3s ease;
                }
                
                .agent-zero-panel-content.open {
                    display: flex;
                    max-height: 500px;
                    overflow-y: auto;
                }
                
                .agent-zero-section {
                    padding: 16px;
                    border-bottom: 1px solid #e1e4e8;
                }
                
                .agent-zero-section-title {
                    font-weight: 600;
                    font-size: 13px;
                    margin-bottom: 8px;
                    color: #24292e;
                }
                
                .agent-form, .task-form {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 8px;
                }
                
                .agent-form input, .task-form input {
                    flex: 1;
                    padding: 6px 8px;
                    border: 1px solid #e1e4e8;
                    border-radius: 4px;
                    font-size: 12px;
                }
                
                button {
                    background: #0366d6;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 6px 12px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: background 0.2s ease;
                }
                
                button:hover {
                    background: #2188ff;
                }
                
                #toggle-panel {
                    background: white;
                    color: #0366d6;
                    border: none;
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-size: 12px;
                    font-weight: bold;
                }
                
                .agent-list, .memory-list, .tool-history {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    max-height: 150px;
                    overflow-y: auto;
                }
                
                .agent-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px;
                    border-radius: 4px;
                    margin-bottom: 4px;
                    cursor: pointer;
                    background: #f6f8fa;
                    transition: background 0.2s ease;
                }
                
                .agent-item:hover {
                    background: #e1e4e8;
                }
                
                .agent-item.active {
                    background: #0366d6;
                    color: white;
                }
                
                .agent-item.status-working {
                    border-left: 3px solid #ffb400;
                }
                
                .agent-item.status-done {
                    border-left: 3px solid #28a745;
                }
                
                .agent-item.status-error {
                    border-left: 3px solid #d73a49;
                }
                
                .memory-item, .history-item {
                    padding: 8px;
                    border-radius: 4px;
                    margin-bottom: 4px;
                    background: #f6f8fa;
                    font-size: 12px;
                }
                
                .memory-content, .history-content {
                    margin-bottom: 4px;
                }
                
                .memory-meta, .history-meta {
                    display: flex;
                    justify-content: space-between;
                    font-size: 10px;
                    color: #6a737d;
                }
                
                .empty-memory, .empty-history {
                    padding: 8px;
                    text-align: center;
                    color: #6a737d;
                    font-size: 12px;
                    font-style: italic;
                }
                
                .memory-tags {
                    color: #0366d6;
                }
                
                .memory-agent, .history-agent {
                    font-weight: bold;
                    color: #0366d6;
                }
                
                .history-action {
                    font-weight: bold;
                    background: #e1e7fe;
                    padding: 2px 4px;
                    border-radius: 3px;
                    margin-right: 4px;
                }
            </style>
            
            <div class="agent-zero-panel">
                <div class="agent-zero-panel-header">
                    <div class="agent-zero-panel-title">
                        <div class="agent-icon-wrapper">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
                                <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none"/>
                                <circle cx="12" cy="12" r="6" fill="white"/>
                            </svg>
                        </div>
                        Agent Zero
                    </div>
                    <button id="toggle-panel">Open</button>
                </div>
                
                <div class="agent-zero-panel-content">
                    <div class="agent-zero-section">
                        <div class="agent-zero-section-title">Agents</div>
                        <div class="agent-form">
                            <input type="text" id="agent-name" placeholder="Enter agent name" />
                            <button id="create-agent">Create</button>
                        </div>
                        <ul id="agent-list" class="agent-list"></ul>
                    </div>
                    
                    <div class="agent-zero-section">
                        <div class="agent-zero-section-title">Execute Task</div>
                        <div class="task-form">
                            <input type="text" id="task-input" placeholder="Enter task for the agent" />
                            <button id="execute-task">Execute</button>
                            <button id="stop-task" style="background: #d73a49; margin-left: 4px;">Stop</button>
                        </div>
                    </div>
                    
                    <div class="agent-zero-section">
                        <div class="agent-zero-section-title">Tool History</div>
                        <ul id="tool-history" class="tool-history"></ul>
                    </div>
                    
                    <div class="agent-zero-section">
                        <div class="agent-zero-section-title">Memory</div>
                        <ul id="memory-list" class="memory-list"></ul>
                        <div style="text-align: right; margin-top: 8px;">
                            <button id="clear-memory" style="background: #d73a49;">Clear Memory</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize UI
        this.updateAgentList();
        this.updateMemoryList();
        this.updateToolHistory();
    }

    private renderError(message: string) {
        this.shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                
                @keyframes rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                @keyframes glow {
                    0% { box-shadow: 0 0 5px rgba(214, 51, 3, 0.5); }
                    50% { box-shadow: 0 0 20px rgba(214, 51, 3, 0.8); }
                    100% { box-shadow: 0 0 5px rgba(214, 51, 3, 0.5); }
                }
                
                .agent-zero-panel {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                    z-index: 10000;
                    width: 350px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    border: 1px solid #d63303;
                    animation: glow 2s infinite ease-in-out;
                }
                
                /* Special styling for fullscreen mode */
                .agent-zero-panel.editor-fullscreen-active {
                    border: 2px solid #d63303;
                    box-shadow: 0 0 25px rgba(214, 51, 3, 0.9);
                }
                
                .agent-zero-panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: #d63303;
                    border-bottom: 1px solid #e1e4e8;
                    color: white;
                }
                
                .agent-zero-panel-title {
                    font-weight: 600;
                    font-size: 14px;
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .agent-zero-panel-title svg {
                    animation: rotate 10s linear infinite;
                }
                
                .agent-icon-wrapper {
                    display: inline-flex;
                    animation: pulse 2s infinite ease-in-out;
                }
                
                .agent-zero-panel-content {
                    display: flex;
                    flex-direction: column;
                    max-height: 500px;
                    overflow-y: auto;
                }
                
                .agent-zero-section {
                    padding: 16px;
                    border-bottom: 1px solid #e1e4e8;
                }
                
                .agent-zero-section-title {
                    font-weight: 600;
                    font-size: 13px;
                    margin-bottom: 8px;
                    color: #d63303;
                }
                
                button {
                    background: #d63303;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 6px 12px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: background 0.2s ease;
                }
                
                button:hover {
                    background: #ff3c00;
                }
                
                #toggle-panel {
                    background: white;
                    color: #d63303;
                    border: none;
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-size: 12px;
                    font-weight: bold;
                }
                
                .error-message {
                    padding: 12px;
                    background: #fff8f6;
                    border-left: 3px solid #d63303;
                    margin-top: 8px;
                    font-size: 13px;
                    color: #24292e;
                    line-height: 1.4;
                }
                
                .retry-button {
                    margin-top: 12px;
                    display: block;
                    width: 100%;
                    text-align: center;
                }
            </style>
            
            <div class="agent-zero-panel">
                <div class="agent-zero-panel-header">
                    <div class="agent-zero-panel-title">
                        <div class="agent-icon-wrapper">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white">
                                <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none"/>
                                <circle cx="12" cy="12" r="6" fill="white"/>
                            </svg>
                        </div>
                        Agent Zero
                    </div>
                    <button id="toggle-panel">Retry</button>
                </div>
                
                <div class="agent-zero-panel-content">
                    <div class="agent-zero-section">
                        <div class="agent-zero-section-title">Error</div>
                        <div class="error-message">${message}</div>
                        <button class="retry-button" id="retry-button">Retry Initialization</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listener for retry button
        const retryButton = this.shadow.querySelector('#retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                this.init(this.editor);
            });
        }
        
        // Add event listener for toggle button (also used as retry)
        const toggleButton = this.shadow.querySelector('#toggle-panel');
        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                this.init(this.editor);
            });
        }
    }

    /**
     * Creates a revolving animation around the editor
     */
    private startRevolvingAnimation() {
        const panel = this.shadow.querySelector('.agent-zero-panel');
        if (!panel) return;
        
        // Get the current position
        const currentPosition = {
            bottom: parseInt((panel as HTMLElement).style.bottom || '20', 10),
            right: parseInt((panel as HTMLElement).style.right || '20', 10)
        };
        
        // If we're already animating, stop
        if (this._animationInterval) {
            clearInterval(this._animationInterval);
            this._animationInterval = null;
            
            // Reset position
            (panel as HTMLElement).style.bottom = '20px';
            (panel as HTMLElement).style.right = '20px';
            
            return;
        }
        
        // Find the editor element
        const editorElement = document.querySelector('.aie-content') || document.querySelector('#aiEditor') || document.querySelector('.aie-container');
        if (!editorElement) {
            console.warn('Could not find editor element for revolving animation');
            return;
        }
        
        // Create a revolving animation
        let angle = 0;
        const radius = 100; // Distance from the center
        const speed = 5; // Degrees per interval
        
        // Use the editor element's position as the center
        const editorRect = editorElement.getBoundingClientRect();
        const centerX = editorRect.left + editorRect.width / 2;
        const centerY = editorRect.top + editorRect.height / 2;
        
        // Save the interval ID so we can clear it later
        this._animationInterval = setInterval(() => {
            angle = (angle + speed) % 360;
            const radian = angle * Math.PI / 180;
            
            // Calculate the new position
            const x = centerX + radius * Math.cos(radian);
            const y = centerY + radius * Math.sin(radian);
            
            // Convert to bottom/right positioning
            const bottom = window.innerHeight - y - (panel as HTMLElement).offsetHeight / 2;
            const right = window.innerWidth - x - (panel as HTMLElement).offsetWidth / 2;
            
            // Update the panel position
            (panel as HTMLElement).style.bottom = `${Math.max(10, bottom)}px`;
            (panel as HTMLElement).style.right = `${Math.max(10, right)}px`;
        }, 50);
        
        // Stop after a few seconds
        setTimeout(() => {
            if (this._animationInterval) {
                clearInterval(this._animationInterval);
                this._animationInterval = null;
                
                // Reset position with smooth transition
                (panel as HTMLElement).style.transition = 'bottom 0.5s, right 0.5s';
                (panel as HTMLElement).style.bottom = '20px';
                (panel as HTMLElement).style.right = '20px';
                
                // Remove transition after it completes
                setTimeout(() => {
                    (panel as HTMLElement).style.transition = '';
                }, 500);
            }
        }, 3000);
    }
    
    /**
     * Writes text to the editor content area
     * @param text The text to write
     * @param options Options for writing (append, replace, etc)
     */
    public writeToEditor(text: string, options: { 
        append?: boolean, 
        typing?: boolean, 
        typingSpeed?: number,
        highlight?: boolean 
    } = {}) {
        try {
            // Find the editor element
            const editorElement = document.querySelector('.aie-content[contenteditable="true"]') as HTMLElement;
            if (!editorElement) {
                console.error('Could not find editor element for writing');
                return false;
            }
            
            // If we have direct access to the editor instance and its commands, use them
            if (this.editor && typeof this.editor.commands?.insertContent === 'function') {
                this.editor.commands.insertContent(text);
                return true;
            }
            
            // Define default options
            const defaultOptions = {
                append: true,
                typing: true,
                typingSpeed: 50,
                highlight: true
            };
            
            // Merge with provided options
            const mergedOptions = { ...defaultOptions, ...options };

            // Check if we should simulate typing
            if (mergedOptions.typing) {
                // Focus the editor
                editorElement.focus();
                
                // If not appending, clear the content
                if (!mergedOptions.append) {
                    editorElement.innerHTML = '';
                }
                
                // If there's no content, we need to ensure it's not in the "empty" state
                if (editorElement.classList.contains('is-editor-empty')) {
                    editorElement.classList.remove('is-editor-empty');
                    // Remove child elements that indicate empty state
                    const emptyElems = editorElement.querySelectorAll('.is-empty, .is-editor-empty');
                    emptyElems.forEach(el => el.remove());
                }
                
                // Find or create a paragraph to add content to
                let paragraph = editorElement.querySelector('p');
                if (!paragraph) {
                    paragraph = document.createElement('p');
                    editorElement.appendChild(paragraph);
                }
                
                // Check if we need to create a paragraph with text instead of an empty one
                if (paragraph.classList.contains('is-empty')) {
                    paragraph.classList.remove('is-empty');
                    paragraph.innerHTML = '';
                }
                
                // If paragraph has a placeholder, remove it
                if (paragraph.hasAttribute('data-placeholder')) {
                    paragraph.removeAttribute('data-placeholder');
                }
                
                // Now type the text character by character
                let i = 0;
                const typeCharacter = () => {
                    if (i < text.length) {
                        // Create text node for character
                        const char = text.charAt(i);
                        
                        // Handle special characters
                        if (char === '\n') {
                            // Create a new paragraph for line breaks
                            const newParagraph = document.createElement('p');
                            editorElement.appendChild(newParagraph);
                            paragraph = newParagraph;
                        } else {
                            // Append normal character
                            paragraph.appendChild(document.createTextNode(char));
                        }
                        
                        // Move to next character
                        i++;
                        setTimeout(typeCharacter, mergedOptions.typingSpeed);
                    } else {
                        // Typing finished, trigger an input event to ensure editor updates
                        editorElement.dispatchEvent(new Event('input', { bubbles: true }));
                        
                        // Highlight the added text if option is enabled
                        if (mergedOptions.highlight) {
                            this.highlightLastContent(editorElement);
                        }
                    }
                };
                
                // Start typing
                typeCharacter();
                return true;
            } else {
                // Direct insertion without typing effect
                if (!mergedOptions.append) {
                    editorElement.innerHTML = '';
                }
                
                // Create a new paragraph if needed
                if (editorElement.innerHTML === '' || editorElement.classList.contains('is-editor-empty')) {
                    editorElement.classList.remove('is-editor-empty');
                    editorElement.innerHTML = `<p>${text}</p>`;
                } else {
                    // Find the last paragraph or create one
                    let paragraph = editorElement.querySelector('p:last-child');
                    if (!paragraph) {
                        paragraph = document.createElement('p');
                        editorElement.appendChild(paragraph);
                    }
                    paragraph.innerHTML += text;
                }
                
                // Trigger input event
                editorElement.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Highlight if needed
                if (mergedOptions.highlight) {
                    this.highlightLastContent(editorElement);
                }
                
                return true;
            }
        } catch (error) {
            console.error('Error writing to editor:', error);
            return false;
        }
    }
    
    /**
     * Highlights the last entered content in the editor
     */
    private highlightLastContent(editorElement: HTMLElement) {
        try {
            // Create a selection range
            const selection = window.getSelection();
            if (!selection) return;
            
            // Clear any existing selection
            selection.removeAllRanges();
            
            // Create a new range for the last paragraph
            const range = document.createRange();
            const lastParagraph = editorElement.querySelector('p:last-child');
            if (!lastParagraph) return;
            
            // Select the last paragraph
            range.selectNodeContents(lastParagraph);
            selection.addRange(range);
            
            // Scroll to the selection
            lastParagraph.scrollIntoView({ behavior: 'smooth', block: 'end' });
            
            // Remove the selection after a short delay
            setTimeout(() => {
                selection.removeAllRanges();
            }, 1000);
        } catch (error) {
            console.error('Error highlighting content:', error);
        }
    }

    /**
     * Add a demo writing button to the panel
     */
    private addWriteToEditorButton() {
        // Create a new section for agent actions
        const agentZeroPanel = this.shadow.querySelector('.agent-zero-panel-content');
        if (!agentZeroPanel) return;
        
        // Create a section for agent actions
        const actionSection = document.createElement('div');
        actionSection.className = 'agent-zero-section';
        actionSection.innerHTML = `
            <div class="agent-zero-section-title">Agent Actions</div>
            <div class="task-form">
                <input type="text" id="agent-text-input" placeholder="Enter text for Agent Zero to write..." />
                <button id="write-to-editor-btn">Write</button>
            </div>
            <div class="action-buttons" style="display: flex; gap: 8px; margin-top: 10px;">
                <button id="clear-editor-btn" style="flex: 1; background: #6c757d;">Clear Editor</button>
                <button id="focus-editor-btn" style="flex: 1; background: #28a745;">Focus Editor</button>
            </div>
            <div class="agent-preset-actions" style="margin-top: 10px;">
                <select id="preset-actions" style="width: 100%; padding: 6px 8px; border: 1px solid #e1e4e8; border-radius: 4px; font-size: 12px;">
                    <option value="">-- Select a preset action --</option>
                    <option value="intro">Introduction Message</option>
                    <option value="code-js">JavaScript Code Sample</option>
                    <option value="code-html">HTML Code Sample</option>
                    <option value="code-css">CSS Code Sample</option>
                    <option value="markdown">Markdown Sample</option>
                </select>
            </div>
        `;
        
        // Add it to the panel
        agentZeroPanel.appendChild(actionSection);
        
        // Add event listener to the write button
        const writeButton = this.shadow.querySelector('#write-to-editor-btn');
        const textInput = this.shadow.querySelector('#agent-text-input') as HTMLInputElement;
        
        if (writeButton && textInput) {
            writeButton.addEventListener('click', () => {
                const text = textInput.value.trim();
                if (text) {
                    // Write the text to the editor with a typing effect
                    this.writeToEditor(text, { 
                        typing: true, 
                        typingSpeed: 30,
                        highlight: true 
                    });
                    
                    // Store in memory if agent is available
                    try {
                        if (this.editor?.storage?.agentZero?.addMemory) {
                            this.editor.storage.agentZero.addMemory(text, this.activeAgentId, ['user-input']);
                            // Refresh memory list
                            this.syncMemoryFromExtension();
                        }
                    } catch (error) {
                        console.warn('Could not store text in agent memory', error);
                    }
                    
                    // Clear the input
                    textInput.value = '';
                }
            });
        }
        
        // Add event listener for clear editor button
        const clearEditorBtn = this.shadow.querySelector('#clear-editor-btn');
        if (clearEditorBtn) {
            clearEditorBtn.addEventListener('click', () => {
                this.writeToEditor('', { 
                    append: false, 
                    typing: false 
                });
                
                // Focus editor after clearing
                const editorElement = document.querySelector('.aie-content[contenteditable="true"]') as HTMLElement;
                if (editorElement) {
                    editorElement.focus();
                }
            });
        }
        
        // Add event listener for focus editor button
        const focusEditorBtn = this.shadow.querySelector('#focus-editor-btn');
        if (focusEditorBtn) {
            focusEditorBtn.addEventListener('click', () => {
                const editorElement = document.querySelector('.aie-content[contenteditable="true"]') as HTMLElement;
                if (editorElement) {
                    editorElement.focus();
                    
                    // Scroll the editor into view if needed
                    editorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Highlight the editor briefly
                    const originalBackground = editorElement.style.background;
                    editorElement.style.transition = 'background-color 0.5s ease';
                    editorElement.style.backgroundColor = 'rgba(3, 102, 214, 0.1)';
                    
                    setTimeout(() => {
                        editorElement.style.backgroundColor = originalBackground;
                        setTimeout(() => {
                            editorElement.style.transition = '';
                        }, 500);
                    }, 500);
                }
            });
        }
        
        // Add event listener for preset actions
        const presetActions = this.shadow.querySelector('#preset-actions') as HTMLSelectElement;
        if (presetActions) {
            presetActions.addEventListener('change', () => {
                const selectedAction = presetActions.value;
                
                if (selectedAction) {
                    let content = '';
                    
                    // Define preset content
                    switch (selectedAction) {
                        case 'intro':
                            content = `Hello! I am Agent Zero, your AI assistant.\nI can help you with coding tasks, answering questions, and more.\nWhat would you like me to help you with today?`;
                            break;
                            
                        case 'code-js':
                            content = `// Here's a simple JavaScript function example
function calculateSum(array) {
    return array.reduce((sum, current) => sum + current, 0);


// Example usage
const numbers = [1, 2, 3, 4, 5];
const sum = calculateSum(numbers);
console.log(\`The sum is \${sum}\`); // Output: The sum is 15`;
                            break;
                            
                        case 'code-html':
                            content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sample Page</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Welcome to my website</h1>
    </header>
    <main>
        <p>This is a sample HTML page.</p>
    </main>
    <footer>
        <p>&copy; 2023 Sample Website</p>
    </footer>
</body>
</html>`;
                            break;
                            
                        case 'code-css':
                            content = `/* Basic CSS styling */
body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    margin: 0;
    padding: 20px;
    color: #333;


header {
    background-color: #f4f4f4;
    padding: 1rem;
    text-align: center;


h1 {
    color: #0366d6;


footer {
    margin-top: 2rem;
    text-align: center;
    font-size: 0.8rem;
}`;
                            break;
                            
                        case 'markdown':
                            content = `# Sample Markdown Document

## Introduction

This is a sample markdown document that demonstrates various formatting options.

## Features

* **Bold text** and *italic text*
* Lists like this one
* [Links](https://example.com)

## Code Example

\`\`\`javascript
function greet(name) {
    return \`Hello, \${name}!\`;

\`\`\`

## Table Example

| Name | Age | Occupation |
|------|-----|------------|
| John | 30  | Developer  |
| Jane | 25  | Designer   |

> Blockquotes are also supported in markdown.`;
                            break;
                    }
                    
                    if (content) {
                        // Use the animateText function if available globally
                        if (window.agentzero && typeof window.agentzero.animateText === 'function') {
                            window.agentzero.animateText(content, 10);
                        } else {
                            // Fallback to local writeToEditor
                            this.writeToEditor(content, { 
                                append: false, 
                                typing: true,
                                typingSpeed: 10
                            });
                        }
                        
                        // Reset select after execution
                        setTimeout(() => {
                            presetActions.value = '';
                        }, 500);
                    }
                }
            });
        }
    }


    private setupFullscreenListeners() {
        // Watch for any element entering fullscreen
        const fullscreenChangeListener = () => {
            const isFullscreen = document.fullscreenElement !== null;
            
            // If fullscreen is activated, make sure panel stays on top
            if (isFullscreen) {
                this._isEditorFullscreen = true;
                this.ensureVisibilityInFullscreen();
            } else {
                this._isEditorFullscreen = false;
                this.restoreNormalVisibility();
            }
        };
        
        // Also watch for editor fullscreen button click
        const editorFullscreenButtonWatch = () => {
            const fullscreenButton = document.querySelector('.aie-button-fullscreen');
            if (fullscreenButton) {
                fullscreenButton.addEventListener('click', () => {
                    // Short delay to let the editor enter fullscreen
                    setTimeout(() => this.ensureVisibilityInFullscreen(), 100);
                });
            }
        };
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                document.addEventListener('fullscreenchange', fullscreenChangeListener);
                editorFullscreenButtonWatch();
            });
        } else {
            document.addEventListener('fullscreenchange', fullscreenChangeListener);
            editorFullscreenButtonWatch();
            
            // Add a listener for class changes on .aie-container
            const containerObserver = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'attributes' && 
                        mutation.attributeName === 'style' &&
                        mutation.target instanceof HTMLElement) {
                        
                        const container = mutation.target as HTMLElement;
                        if (container.style.position === 'fixed' || 
                            container.style.position === 'absolute') {
                            this._isEditorFullscreen = true;
                            this.ensureVisibilityInFullscreen();
                        } else if (this._isEditorFullscreen) {
                            this._isEditorFullscreen = false;
                            this.restoreNormalVisibility();
                        }
                    }
                });
            });
            
            // Observe the editor container
            const editorContainer = document.querySelector('.aie-container');
            if (editorContainer) {
                containerObserver.observe(editorContainer, { 
                    attributes: true,
                    attributeFilter: ['style']
                });
            }
        }
    }
    
    public ensureVisibilityInFullscreen() {
        const panel = this.shadow.querySelector('.agent-zero-panel') as HTMLElement;
        if (panel) {
            // Save current styles to restore later if needed
            this.saveCurrentStyles(panel);
            
            // Make panel visible above fullscreen
            panel.style.zIndex = '100000'; // Higher than editor fullscreen z-index
            panel.style.position = 'fixed';
            panel.style.bottom = '20px';
            panel.style.right = '20px';
            
            // Add a class for CSS targeting
            panel.classList.add('editor-fullscreen-active');
            
            // Make sure the panel itself is visible
            this.style.display = 'block';
            this.style.visibility = 'visible';
            
            // Reset any previous transitions
            panel.style.transition = 'all 0.3s ease';
            
            console.log('Agent Zero panel positioned above fullscreen editor');
        }
    }
    
    public restoreNormalVisibility() {
        const panel = this.shadow.querySelector('.agent-zero-panel') as HTMLElement;
        if (panel) {
            // Restore normal z-index
            panel.style.zIndex = '10000';
            panel.classList.remove('editor-fullscreen-active');
            console.log('Agent Zero panel restored to normal visibility');
        }
    }
    
    private saveCurrentStyles(element: HTMLElement) {
        if (!element.dataset.originalZIndex) {
            element.dataset.originalZIndex = element.style.zIndex || '1000';
        }
    }
}

