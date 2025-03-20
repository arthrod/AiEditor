import { agentZeroConfig } from "../agentzero.ts";
import { InnerEditor } from "../core/AiEditor.ts";
import { AgentZeroAiModel } from "./agentzero/AgentZeroAiModel.ts";
import { AiGlobalConfig } from "./AiGlobalConfig.ts";
import { AiModel } from "./core/AiModel.ts";
import { CustomAiModel } from "./custom/CustomAiModel.ts";
import { GiteeAiModel } from "./gitee/GiteeAiModel.ts";
import { OpenaiAiModel } from "./openai/OpenaiAiModel.ts";
import { OpenRouterAiModel } from "./openrouter/OpenRouterAiModel.ts";
import { SparkAiModel } from "./spark/SparkAiModel.ts";
import { WenXinAiModel } from "./wenxin/WenXinAiModel.ts";

export namespace AiModelManager {
    const models = new Map<string, AiModel>();

    export function registerModels(editor: InnerEditor, globalConfig: AiGlobalConfig) {
        if (globalConfig && globalConfig.models) {
            for (let key of Object.keys(globalConfig.models)) {
                switch (key) {
                    case "spark":
                        models.set(key, new SparkAiModel(editor, globalConfig))
                        break;
                    case "wenxin":
                        models.set(key, new WenXinAiModel(editor, globalConfig))
                        break;
                    case "openai":
                        models.set(key, new OpenaiAiModel(editor, globalConfig))
                        break;
                    case "gitee":
                        models.set(key, new GiteeAiModel(editor, globalConfig))
                        break;
                    case "openrouter":
                        models.set(key, new OpenRouterAiModel(editor, globalConfig))
                        break;
                    case "custom":
                        models.set(key, new CustomAiModel(editor, globalConfig))
                        break;
                    case "agentZero":
                        models.set(key, new AgentZeroAiModel(
                            editor,
                            {
                                apiKey: globalConfig.models?.agentZero?.apiKey,
                                endpoint: globalConfig.models?.agentZero?.endpoint,
                                memory: globalConfig.models?.agentZero?.memory || agentZeroConfig.memory,
                                toolUsage: globalConfig.models?.agentZero?.toolUsage || agentZeroConfig.toolUsage,
                                multiAgent: globalConfig.models?.agentZero?.multiAgent || agentZeroConfig.multiAgent,
                                browserAgent: globalConfig.models?.agentZero?.browserAgent || agentZeroConfig.browserAgent
                            }
                        ))
                        break;
                    default:
                        const aiModel = globalConfig.modelFactory?.create(key, editor, globalConfig);
                        if (aiModel) models.set(key, aiModel);
                }
            }
        }
    }

    export function get(modelName: string): AiModel {
        if (!modelName || modelName === "auto") {
            modelName = Array.from(models.keys())[0];
        }
        return models.get(modelName);
    }

    export function set(modelName: string, aiModel: AiModel) {
        models.set(modelName, aiModel);
    }

    export function getAll(): Array<{name: string, model: AiModel}> {
        return Array.from(models.entries()).map(([key, model]) => ({
            name: key,
            model: model
        }));
    }
}