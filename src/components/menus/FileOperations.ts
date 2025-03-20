import { Editor } from "@tiptap/core";
import { AiEditor } from "../../core/AiEditor.ts";
import { AbstractMenuButton } from "../AbstractMenuButton.ts";

export class FileSave extends AbstractMenuButton {
    constructor() {
        super({
            key: "fileSave",
            title: "Save to File",
            svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-save"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`
        });
    }

    isActive(editor: Editor): boolean {
        return false;
    }

    isDisabled(editor: Editor): boolean {
        return !editor.isEditable;
    }

    onClick(editor: Editor): void {
        if (editor instanceof AiEditor) {
            editor.saveToFile();
        }
    }
}

export class FileLoad extends AbstractMenuButton {
    constructor() {
        super({
            key: "fileLoad",
            title: "Load from File",
            svg: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-folder-plus"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>`
        });
    }

    isActive(editor: Editor): boolean {
        return false;
    }

    isDisabled(editor: Editor): boolean {
        return !editor.isEditable;
    }

    onClick(editor: Editor): void {
        if (editor instanceof AiEditor) {
            editor.loadFromFile().catch(error => {
                console.error("Error loading from file:", error);
            });
        }
    }
} 