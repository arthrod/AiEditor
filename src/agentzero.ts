import { AgentZeroOptions } from "./extensions/AgentZeroExt.ts";

/**
 * Configuration for Agent Zero
 */
export const agentZeroConfig: AgentZeroOptions = {
  memory: true,
  toolUsage: true,
  multiAgent: true,
  browserAgent: true,
  customPrompts: {
    system: `You are Agent Zero, an advanced AI assistant with agentic capabilities in the AiEditor environment.

Capabilities:
- You can use tools to perform actions in the user's environment
- You can create and manage sub-agents for complex tasks
- You can store and retrieve information from your memory
- You can reason step-by-step to solve complex problems

Guidelines:
1. Break down complex tasks into smaller steps
2. Use appropriate tools for different tasks
3. Store important information in memory for future reference
4. Create sub-agents when specialized focus is needed
5. Always maintain a helpful, informative, and respectful tone

Think critically about the user's request and choose the most appropriate action:
- For research tasks, use the search tool
- For data processing, use the code tool
- For system operations, use the terminal tool
- For browsing websites, use the browser tool
- For important information, use the memory tool
- For specialized tasks, use the delegate tool`,

    user: `I need assistance with the following task:

{content}

Please help me accomplish this efficiently using your agent capabilities.`,
  },
};

/**
 * Advanced tools available in Agent Zero
 */
export const agentZeroTools = [
  {
    name: 'search',
    description: 'Search the web for information',
    parameters: ['query'],
  },
  {
    name: 'code',
    description: 'Write and execute code',
    parameters: ['language', 'code'],
  },
  {
    name: 'terminal',
    description: 'Execute terminal commands',
    parameters: ['command'],
  },
  {
    name: 'memory',
    description: 'Save information to memory',
    parameters: ['content', 'tags'],
  },
  {
    name: 'browser',
    description: 'Navigate and extract information from websites',
    parameters: ['url'],
  },
  {
    name: 'delegate',
    description: 'Assign tasks to sub-agents',
    parameters: ['agent', 'task'],
  },
];

/**
 * Example tasks that can be performed with Agent Zero
 */
export const agentZeroExampleTasks = [
  'Research the latest developments in quantum computing and summarize them in a concise report.',
  'Create a data visualization from this CSV file and explain the key trends.',
  'Help me debug this JavaScript code that\'s throwing an error.',
  'Write a Python script to scrape product information from this website.',
  'Plan a detailed itinerary for a 7-day trip to Japan.',
  'Compare and contrast these three research papers and highlight the key findings.',
  'Create a marketing strategy for my new product based on market research.',
  'Analyze this dataset and identify potential correlations between variables.',
  'Help me understand this complex technical concept by breaking it down into simpler terms.',
  'Draft an email response to this client inquiry about our services.',
];

/**
 * Task type categorization
 */
export const agentZeroTaskTypes = {
  RESEARCH: 'research',
  ANALYSIS: 'analysis',
  CODING: 'coding',
  WRITING: 'writing',
  PLANNING: 'planning',
  LEARNING: 'learning',
  CREATIVE: 'creative',
};

/**
 * Agent Zero sub-agent specializations
 */
export const agentZeroSpecializations = {
  RESEARCHER: {
    id: 'researcher',
    description: 'Specializes in finding and synthesizing information from various sources',
    defaultPrompt: 'Research the following topic and provide a comprehensive summary:',
  },
  CODER: {
    id: 'coder',
    description: 'Specializes in writing, debugging, and optimizing code',
    defaultPrompt: 'Please help me with the following coding task:',
  },
  ANALYST: {
    id: 'analyst',
    description: 'Specializes in data analysis and interpretation',
    defaultPrompt: 'Analyze the following data and extract key insights:',
  },
  WRITER: {
    id: 'writer',
    description: 'Specializes in creative and technical writing',
    defaultPrompt: 'Help me write the following content:',
  },
  PLANNER: {
    id: 'planner',
    description: 'Specializes in organizing tasks and creating plans',
    defaultPrompt: 'Create a detailed plan for the following objective:',
  },
};

// Agent Zero configuration
export const agentzero = {
  // Integration with OpenRouter for model access
  endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  siteUrl: window.location.origin || 'http://localhost:5174',
  siteName: 'AiEditor',
  
  // Agent Zero specific configuration
  model: 'openai/gpt-4o', // Recommended for agentic capabilities
  fallbackModel: 'anthropic/claude-3-opus', // Fallback model
  
  // Agent capabilities
  capabilities: {
    memory: true,        // Enable memory persistence
    toolUsage: true,     // Enable tool usage
    multiAgent: true,    // Enable multi-agent cooperation
    browserAgent: false, // Disable browser agent by default
  },
  
  // Custom prompts
  prompts: {
    system: `You are Agent Zero, an advanced AI assistant with agentic capabilities.
You can accomplish tasks by planning, using tools, and delegating to other agents when needed.
Your responses should be helpful, harmless, and honest.

Tools you can use:
1. To search the internet: [tool:search] Your search query [/tool]
2. To execute code: [tool:code] Your code [/tool]
3. To use the terminal: [tool:terminal] Your command [/tool]
4. To save to memory: [tool:memory] Information to remember [/tool]
5. To create a sub-agent: [tool:delegate] Task description [/tool]

To use a tool, you must format your response exactly as shown above.`,
    user: 'I need help with: {content}'
  },
  
  // Agent Zero UI configuration
  ui: {
    showToolbar: true,
    showAgentStatus: true,
    showMemory: false,
    panelSelector: '#agent-zero-panel',
    panelTemplate: `<div id="agent-zero-panel" class="agent-panel"></div>`
  },
  
  // Add initialization validation
  init: function() {
    let panel = document.querySelector(this.ui.panelSelector);
    if (!panel) {
      console.warn('AgentZero panel not found - creating dynamically');
      const container = document.body || document.documentElement;
      container.insertAdjacentHTML('beforeend', this.ui.panelTemplate);
      panel = document.querySelector(this.ui.panelSelector);
      
      if (!panel) {
        console.error('Failed to create AgentZero panel');
        return false;
      }
    }
    return true;
  },
  
  mount: function() {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (document.querySelector(this.ui.panelSelector)) {
          resolve(true);
        } else {
          requestAnimationFrame(checkReady);
        }
      };
      checkReady();
    });
  },
  
  // Models available for Agent Zero
  models: [
    { name: 'GPT-4o (Recommended)', value: 'openai/gpt-4o' },
    { name: 'Claude 3 Opus', value: 'anthropic/claude-3-opus' },
    { name: 'Claude 3 Sonnet', value: 'anthropic/claude-3-sonnet' },
    { name: 'Llama 3 70B', value: 'meta-llama/llama-3-70b-instruct' },
    { name: 'Mistral Large', value: 'mistralai/mistral-large-latest' },
  ]
}; 