declare global {
  interface Window {
    editorInstance: import("./core/AiEditor").InnerEditor;
    aiEditor: any;
    changeTheme: () => void;
    agentzero?: {
      panel?: any;
      writeToEditor?: (text: string, options?: any) => boolean;
      write?: (text: string, options?: any) => boolean;
      animateText?: (text: string, speed?: number) => Promise<boolean>;
      startRevolvingAnimation?: () => boolean;
      abortCurrentOperation?: () => void;
    };
    createAgentZeroCompatibilityAdapter?: (editor: import("./core/AiEditor").InnerEditor) => any;
  }
}

// Add extension to the SingleCommands interface
declare module "./core/AiEditor" {
  interface SingleCommands {
    setAgentPanel?: (panel: any) => void;
    agentZero?: any;
    createSubAgent?: (name: string) => void;
    setActiveAgent?: (id: string) => void;
    executeAgentTask?: (task: string) => void;
    stopAgentTask?: () => void;
    clearAgentMemory?: () => void;
  }
}

export { }; // Make this a module 
