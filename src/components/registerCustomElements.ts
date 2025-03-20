import { defineCustomElement } from "../commons/defineCustomElement.ts";
import { AgentZeroPanel } from "./AgentZeroPanel.ts";
import { AiModelManagerButton } from "./menus/AiModelManager.ts";
import { ClearPage } from "./menus/ClearPage.ts";
import { FileLoad, FileSave } from "./menus/FileOperations.ts";
import { SmartAutoCorrect } from "./menus/SmartAutoCorrect.ts";

// Register our custom elements
defineCustomElement("aie-file-save", FileSave);
defineCustomElement("aie-file-load", FileLoad);
defineCustomElement("aie-clear-page", ClearPage);
defineCustomElement("aie-smart-auto-correct", SmartAutoCorrect);
defineCustomElement("aie-agent-zero-panel", AgentZeroPanel);
defineCustomElement("aie-model-manager", AiModelManagerButton);
