# AI Model Selection

AiEditor now provides enhanced control over AI models with a dedicated Model Selector in the toolbar, allowing users to choose specific models within each AI provider.

## Using the Model Selector

The Model Selector is accessible directly from the toolbar and works in conjunction with the AI Provider Selector:

1. First, choose your AI provider using the **AI Provider Selector**
2. Then, select a specific model for that provider using the **Model Selector** 

![Model Selector Screenshot](../assets/model-selector.png)

Each provider has different available models with various capabilities and performance characteristics:

### OpenAI Models
- **GPT-4o**: Latest GPT-4 model with advanced capabilities
- **GPT-4o Mini**: Smaller, faster version of GPT-4o
- **GPT-4 Turbo**: High performance GPT-4 model
- **GPT-3.5 Turbo**: Fast and cost-effective model

### OpenRouter Models
- **Claude 3 Opus**: Anthropic's most powerful model
- **Claude 3 Sonnet**: Balanced Claude model
- **Claude 3 Haiku**: Fast, efficient Claude model
- **Gemini Pro**: Google's Gemini Pro model
- **Llama 3 70B**: Meta's largest Llama 3 model

### Spark Models
- **Spark 4.0**: Latest Spark model
- **Spark 3.5**: Balanced performance and cost
- **Spark 3.1**: Older Spark model
- **Spark 2.1**: Legacy Spark model

### WenXin (Baidu) Models
- **ERNIE 4.0**: Baidu's latest ERNIE model
- **ERNIE 3.5 Turbo**: Baidu's ERNIE 3.5 model
- **ERNIE Speed**: Fast ERNIE model

### Gitee Models
- **JC-2.0**: Gitee code model 2.0
- **JC-1.0**: Gitee code model 1.0

## Configuration

### Adding to Toolbar

The Model Selector is included in the default toolbar configuration. If you need to manually add it to a custom toolbar configuration, include the `model-selector` key in your toolbar keys:

```typescript
new AiEditor({
    element: "#aiEditor",
    toolbarKeys: [
        // ... other toolbar keys
        "ai-provider-selector", "model-selector", "api-key-manager"
    ],
})
```

### Custom Models List

You can provide a custom list of models for specific providers by configuring the `models` property:

```typescript
new AiEditor({
    element: "#aiEditor",
    ai: {
        models: {
            openrouter: {
                model: 'anthropic/claude-3-sonnet', // default model
                models: [
                    { name: 'Claude 3 Opus', value: 'anthropic/claude-3-opus', description: 'Most powerful' },
                    { name: 'Claude 3 Sonnet', value: 'anthropic/claude-3-sonnet', description: 'Balanced' },
                    { name: 'Claude 3 Haiku', value: 'anthropic/claude-3-haiku', description: 'Fast' }
                ]
            }
        }
    }
})
```

## Integration with Provider Selector and API Key Manager

The Model Selector works seamlessly with the AI Provider Selector and API Key Manager:

1. AI Provider Selector: Choose which AI provider to use
2. Model Selector: Select a specific model from the chosen provider
3. API Key Manager: Enter your API keys for the selected provider

Together, these tools provide a complete solution for managing AI capabilities within the editor.

## Example Implementation

Here's a complete example showing how to integrate all three components:

```typescript
new AiEditor({
    element: "#aiEditor",
    ai: {
        models: {
            openai: {
                model: 'gpt-4o-mini'
            },
            openrouter: {
                model: 'anthropic/claude-3-haiku'
            },
            spark: {
                version: "v3.5"
            }
        },
        bubblePanelEnable: true,
        bubblePanelModel: "auto",
    },
    toolbarKeys: ["undo", "redo", "|", "heading", "font-family", "font-size", 
        "|", "bold", "italic", "underline", "|", "ai", "ai-provider-selector", 
        "model-selector", "api-key-manager"]
})
```

This configuration enables users to:
1. Select which AI provider to use via the AI Provider Selector
2. Choose a specific model for that provider with the Model Selector
3. Enter their API keys for each provider through the API Key Manager 

### Example with DeepSeek Models

The ModelSelector component now includes support for DeepSeek models through OpenRouter. For example, to configure the DEEPSEEK-R1-ZERO:FREE model:

```typescript
new AiEditor({
    element: "#aiEditor",
    ai: {
        models: {
            openrouter: {
                apiKey: "your-openrouter-api-key",
                model: 'deepseek-ai/deepseek-r1-zero:free', // Default to free DeepSeek model
                // Optional: customize the available models list
                models: [
                    { name: 'DEEPSEEK-R1-ZERO:FREE', value: 'deepseek-ai/deepseek-r1-zero:free', description: 'Free tier DeepSeek model' },
                    { name: 'DeepSeek Coder', value: 'deepseek-ai/deepseek-coder', description: 'Coding-specialized model' },
                    { name: 'Claude 3 Haiku', value: 'anthropic/claude-3-haiku', description: 'Fast, efficient Claude model' }
                ]
            }
        },
        bubblePanelModel: "openrouter",
    },
    toolbarKeys: ["ai", "ai-provider-selector", "model-selector", "api-key-manager"]
})
```

This configuration will:
1. Set OpenRouter as the default provider
2. Set DEEPSEEK-R1-ZERO:FREE as the default model
3. Only show the three specified models in the model selector dropdown 

### Example with Universal ModelId Field

Here's an example showing how to configure a DeepSeek model using the universal `modelId` field:

```typescript
new AiEditor({
  ai: {
    bubblePanelModel: 'openrouter', // Set OpenRouter as default provider
    models: {
      openrouter: {
        apiKey: 'your-openrouter-api-key',
        modelId: 'deepseek-ai/deepseek-r1-zero:free', // Use universal modelId field
        // No need to set 'model' field as it will be automatically set from modelId
      },
    }
  }
})
```

## Model Selection

AiEditor supports various AI providers and models. You can select and configure different AI models based on your needs.

### Universal Model ID

AiEditor supports a universal `modelId` field that works across all providers. This makes it easier to configure and switch between models:

```typescript
new AiEditor({
  ai: {
    models: {
      openai: {
        apiKey: 'your-openai-api-key',
        modelId: 'gpt-4-turbo' // Will be used as the model identifier
      },
      openrouter: {
        apiKey: 'your-openrouter-api-key',
        modelId: 'anthropic/claude-3-haiku' // Will be used as the model identifier
      }
    }
  }
})
```

The `modelId` field has the highest priority across all providers. Each provider will use this field first if it's available, falling back to provider-specific fields like `model` or `version` for backward compatibility.

### Configuring Different Providers

// ... existing code ... 