# API 密钥管理

AiEditor 现在支持通过工具栏直接进行 API 密钥管理，允许用户设置自己的 API 密钥用于不同的 AI 提供商，无需开发者配置。

## 使用 API 密钥管理器

API 密钥管理器可以直接从工具栏访问，用钥匙图标表示。点击此图标将打开一个对话框，用户可以在其中为不同支持的 AI 提供商输入 API 密钥：

- OpenAI (ChatGPT)
- OpenRouter
- 讯飞星火 (IFLYTEK Spark)
- 百度文心一言 (Baidu WenXin)
- 码云 (Gitee)
- 自定义 API

![API 密钥管理器截图](../../assets/api-key-manager.png)

## 配置

### 添加到工具栏

API 密钥管理器已包含在默认工具栏配置中。如果您需要手动将其添加到自定义工具栏配置中，请在工具栏键中包含 `api-key-manager` 键：

```typescript
new AiEditor({
    element: "#aiEditor",
    toolbarKeys: [
        // ... 其他工具栏键
        "ai-provider-selector", "api-key-manager"
    ],
})
```

### 开发者覆盖

作为开发者，您可以在编辑器初始化时预配置 API 模型，同时仍允许用户覆盖这些设置：

```typescript
new AiEditor({
    element: "#aiEditor",
    ai: {
        models: {
            openai: {
                apiKey: "默认-api-密钥", // 可以被用户覆盖
                model: 'gpt-4o-mini'
            }
        }
    },
})
```

当用户通过 API 密钥管理器设置自己的 API 密钥时，它将覆盖其会话的默认值。这样可以让您提供默认密钥，同时给用户使用自己密钥的灵活性。

## 安全考虑

通过 API 密钥管理器输入的用户 API 密钥：

1. 仅在当前会话中存储在内存中
2. 默认情况下不会持久化到服务器存储
3. 直接用于对相应 AI 提供商的 API 请求

对于安全敏感的应用程序，请考虑实现服务器端 API 请求签名，如[服务器端签名](./base.html#服务器端签名)文档中所述。

## 实现示例

以下是一个完整示例，展示如何在编辑器中同时集成 AI 提供商选择器和 API 密钥管理器：

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

此配置允许用户：
1. 通过 AI 提供商选择器选择使用哪个 AI 提供商
2. 为每个提供商输入自己的 API 密钥
3. 使用他们首选的提供商和自己的 API 密钥使用 AI 功能 