# AI 模型选择

AiEditor 现在通过工具栏中的专用模型选择器提供对 AI 模型的增强控制，允许用户在每个 AI 提供商内选择特定模型。

## 使用模型选择器

模型选择器可直接从工具栏访问，与 AI 提供商选择器协同工作：

1. 首先，使用 **AI 提供商选择器** 选择您的 AI 提供商
2. 然后，使用 **模型选择器** 选择该提供商的特定模型

![模型选择器截图](../../assets/model-selector.png)

每个提供商都有不同的可用模型，各具不同的功能和性能特点：

### OpenAI 模型
- **GPT-4o**：最新的 GPT-4 模型，具有高级功能
- **GPT-4o Mini**：GPT-4o 的更小、更快版本
- **GPT-4 Turbo**：高性能 GPT-4 模型
- **GPT-3.5 Turbo**：快速且经济实惠的模型

### OpenRouter 模型
- **Claude 3 Opus**：Anthropic 最强大的模型
- **Claude 3 Sonnet**：平衡的 Claude 模型
- **Claude 3 Haiku**：快速、高效的 Claude 模型
- **Gemini Pro**：Google 的 Gemini Pro 模型
- **Llama 3 70B**：Meta 最大的 Llama 3 模型

### 讯飞星火模型
- **Spark 4.0**：最新的星火模型
- **Spark 3.5**：平衡性能和成本
- **Spark 3.1**：较旧的星火模型
- **Spark 2.1**：传统星火模型

### 文心一言（百度）模型
- **ERNIE 4.0**：百度最新的 ERNIE 模型
- **ERNIE 3.5 Turbo**：百度的 ERNIE 3.5 模型
- **ERNIE Speed**：快速的 ERNIE 模型

### Gitee 模型
- **JC-2.0**：Gitee 代码模型 2.0
- **JC-1.0**：Gitee 代码模型 1.0

### DeepSeek 模型示例

ModelSelector 组件现在通过 OpenRouter 提供对 DeepSeek 模型的支持。例如，要配置 DEEPSEEK-R1-ZERO:FREE 模型：

```typescript
new AiEditor({
    element: "#aiEditor",
    ai: {
        models: {
            openrouter: {
                apiKey: "your-openrouter-api-key",
                model: 'deepseek-ai/deepseek-r1-zero:free', // 默认使用免费 DeepSeek 模型
                // 可选：自定义可用模型列表
                models: [
                    { name: 'DEEPSEEK-R1-ZERO:FREE', value: 'deepseek-ai/deepseek-r1-zero:free', description: '免费版 DeepSeek 模型' },
                    { name: 'DeepSeek Coder', value: 'deepseek-ai/deepseek-coder', description: '专注于代码的模型' },
                    { name: 'Claude 3 Haiku', value: 'anthropic/claude-3-haiku', description: '快速高效的 Claude 模型' }
                ]
            }
        },
        bubblePanelModel: "openrouter",
    },
    toolbarKeys: ["ai", "ai-provider-selector", "model-selector", "api-key-manager"]
})
```

此配置将：
1. 将 OpenRouter 设置为默认提供商
2. 将 DEEPSEEK-R1-ZERO:FREE 设置为默认模型
3. 在模型选择器下拉菜单中只显示这三个指定的模型

## 配置

### 添加到工具栏

模型选择器已包含在默认工具栏配置中。如果您需要手动将其添加到自定义工具栏配置中，请在工具栏键中包含 `model-selector` 键：

```typescript
new AiEditor({
    element: "#aiEditor",
    toolbarKeys: [
        // ... 其他工具栏键
        "ai-provider-selector", "model-selector", "api-key-manager"
    ],
})
```

### 自定义模型列表

您可以通过配置 `models` 属性为特定提供商提供自定义模型列表：

```typescript
new AiEditor({
    element: "#aiEditor",
    ai: {
        models: {
            openrouter: {
                model: 'anthropic/claude-3-sonnet', // 默认模型
                models: [
                    { name: 'Claude 3 Opus', value: 'anthropic/claude-3-opus', description: '最强大' },
                    { name: 'Claude 3 Sonnet', value: 'anthropic/claude-3-sonnet', description: '平衡型' },
                    { name: 'Claude 3 Haiku', value: 'anthropic/claude-3-haiku', description: '快速' }
                ]
            }
        }
    }
})
```

## 与提供商选择器和 API 密钥管理器的集成

模型选择器与 AI 提供商选择器和 API 密钥管理器无缝协作：

1. AI 提供商选择器：选择要使用的 AI 提供商
2. 模型选择器：从所选提供商中选择特定模型
3. API 密钥管理器：输入所选提供商的 API 密钥

这些工具共同为编辑器内的 AI 功能管理提供了完整解决方案。

## 实现示例

这里是一个展示如何集成所有三个组件的完整示例：

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

此配置使用户能够：
1. 通过 AI 提供商选择器选择要使用的 AI 提供商
2. 使用模型选择器为该提供商选择特定模型
3. 通过 API 密钥管理器输入每个提供商的 API 密钥 

## 模型选择

AiEditor 支持多种 AI 服务提供商和模型。您可以根据需求选择和配置不同的 AI 模型。

### 通用模型 ID

AiEditor 支持一个通用的 `modelId` 字段，该字段适用于所有服务提供商。这使得配置和切换模型变得更加简单：

```typescript
new AiEditor({
  ai: {
    models: {
      openai: {
        apiKey: 'your-openai-api-key',
        modelId: 'gpt-4-turbo' // 将被用作模型标识符
      },
      openrouter: {
        apiKey: 'your-openrouter-api-key',
        modelId: 'anthropic/claude-3-haiku' // 将被用作模型标识符
      }
    }
  }
})
```

在所有服务提供商中，`modelId` 字段具有最高优先级。如果该字段可用，每个服务提供商将首先使用此字段，如果不可用则会回退到服务提供商特定的字段（如 `model` 或 `version`）以保持向后兼容性。

### 配置不同的服务提供商

### 使用通用 ModelId 字段的示例

以下是使用通用 `modelId` 字段配置 DeepSeek 模型的示例：

```typescript
new AiEditor({
  ai: {
    bubblePanelModel: 'openrouter', // 设置 OpenRouter 为默认提供商
    models: {
      openrouter: {
        apiKey: 'your-openrouter-api-key',
        modelId: 'deepseek-ai/deepseek-r1-zero:free', // 使用通用 modelId 字段
        // 不需要设置 'model' 字段，因为它会自动从 modelId 设置
      },
    }
  }
})
```

### DeepSeek 模型示例

ModelSelector 组件现在通过 OpenRouter 提供对 DeepSeek 模型的支持。例如，要配置 DEEPSEEK-R1-ZERO:FREE 模型：

```typescript
new AiEditor({
    element: "#aiEditor",
    ai: {
        models: {
            openrouter: {
                apiKey: "your-openrouter-api-key",
                model: 'deepseek-ai/deepseek-r1-zero:free', // 默认使用免费 DeepSeek 模型
                // 可选：自定义可用模型列表
                models: [
                    { name: 'DEEPSEEK-R1-ZERO:FREE', value: 'deepseek-ai/deepseek-r1-zero:free', description: '免费版 DeepSeek 模型' },
                    { name: 'DeepSeek Coder', value: 'deepseek-ai/deepseek-coder', description: '专注于代码的模型' },
                    { name: 'Claude 3 Haiku', value: 'anthropic/claude-3-haiku', description: '快速高效的 Claude 模型' }
                ]
            }
        },
        bubblePanelModel: "openrouter",
    },
    toolbarKeys: ["ai", "ai-provider-selector", "model-selector", "api-key-manager"]
})
```

此配置将：
1. 将 OpenRouter 设置为默认提供商
2. 将 DEEPSEEK-R1-ZERO:FREE 设置为默认模型
3. 在模型选择器下拉菜单中只显示这三个指定的模型 