# API Key Management

AiEditor now supports direct API key management via the toolbar, allowing users to set their own API keys for different AI providers without requiring developer configuration.

## Using the API Key Manager

The API Key Manager is accessible directly from the toolbar, represented by a key icon. Clicking on this icon opens a dialog where users can enter their API keys for different supported AI providers:

- OpenAI (ChatGPT)
- OpenRouter
- IFLYTEK Spark
- Baidu WenXin
- Gitee
- Custom API

![API Key Manager Screenshot](../assets/api-key-manager.png)

## Configuration

### Adding to Toolbar

The API Key Manager is included in the default toolbar configuration. If you need to manually add it to a custom toolbar configuration, include the `api-key-manager` key in your toolbar keys:

```typescript
new AiEditor({
    element: "#aiEditor",
    toolbarKeys: [
        // ... other toolbar keys
        "ai-provider-selector", "api-key-manager"
    ],
})
```

### Developer Override

As a developer, you can pre-configure the API models in the editor initialization while still allowing users to override these settings:

```typescript
new AiEditor({
    element: "#aiEditor",
    ai: {
        models: {
            openai: {
                apiKey: "default-api-key", // Can be overridden by user
                model: 'gpt-4o-mini'
            }
        }
    },
})
```

When a user sets their own API key through the API Key Manager, it will override the default value for their session. This allows you to provide default keys while giving users the flexibility to use their own.

## Security Considerations

The API keys entered by users through the API Key Manager are:

1. Stored in memory only for the current session
2. Not persisted to server storage by default
3. Used directly in API requests to the respective AI providers

For applications where security is a concern, consider implementing server-side signing for API requests as described in the [Server-side Signature](./base.html#server-side-signature) documentation.

## Example Implementation

Here's a complete example showing how to integrate both the AI provider selector and API key manager in your editor:

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
        "|", "bold", "italic", "underline", "|", "ai", "ai-provider-selector", "api-key-manager"]
})
```

This configuration allows users to:
1. Select which AI provider to use via the AI provider selector
2. Enter their own API keys for each provider
3. Use the AI features with their preferred provider and their own API keys 