import { EditorEvents } from "@tiptap/core";
import { t } from "i18next";
import tippy from "tippy.js";
import { AbstractMenuButton } from "../components/AbstractMenuButton.ts";
import { Custom } from "../components/menus/Custom.ts";
import { Group } from "../components/menus/Group.ts";
import { AiEditorOptions, CustomMenu, InnerEditor, MenuGroup } from "../core/AiEditor.ts";

export const initToolbarKeys = (event: EditorEvents["create"],
                                options: AiEditorOptions,
                                menuButtons: AbstractMenuButton[],
                                toolbarKeys: (string | CustomMenu | MenuGroup)[]) => {

    for (let toolbarKey of toolbarKeys) {
        if (!toolbarKey) continue;

        try {
            if (typeof toolbarKey === "string") {
                toolbarKey = toolbarKey.trim();
                if (toolbarKey === "|") {
                    toolbarKey = "divider"
                }
                
                // Check if custom element is defined
                const elementName = "aie-" + toolbarKey;
                if (!customElements.get(elementName)) {
                    console.warn(`Custom element '${elementName}' is not registered yet. Skipping toolbar initialization for this item.`);
                    continue;
                }
                
                // Create the element without attributes
                const menuButton = document.createElement(elementName) as AbstractMenuButton;
                
                // Add the class after creation
                menuButton.classList.add("aie-menu-item");

                // Check if onCreate exists before calling it
                if (typeof menuButton.onCreate === 'function') {
                    menuButton.onCreate(event, options);
                } else {
                    console.warn(`Menu button for ${toolbarKey} doesn't have onCreate method. Check if the class extends AbstractMenuButton properly.`);
                }
                
                // Set the non-editable property after creation
                if (typeof menuButton.onEditableChange === 'function') {
                    menuButton.onEditableChange(!!options.editable);
                }

                if (toolbarKey !== "divider") {
                    const tip = t(toolbarKey) as string;
                    
                    // Set attributes after element is created
                    requestAnimationFrame(() => {
                        menuButton.setAttribute("data-title", tip);
                        menuButton.setAttribute("data-size", options.toolbarSize as string);
                        menuButton.setAttribute("tabindex", "0");
                        menuButton.setAttribute("role", "button");
                        menuButton.setAttribute("aria-label", tip);
                        
                        // Initialize tooltip after attributes are set
                        if (tip) {
                            tippy(menuButton, {
                                appendTo: document.body,
                                content: tip,
                                theme: 'aietip',
                                arrow: true
                            });
                        }
                    });
                }
                menuButtons.push(menuButton);
            } else {
                //menu group
                if ((toolbarKey as any).toolbarKeys) {
                    const menuGroup = toolbarKey as MenuGroup;
                    
                    // Check if custom element is defined
                    if (!customElements.get('aie-group')) {
                        console.warn(`Custom element 'aie-group' is not registered yet. Skipping toolbar initialization for this item.`);
                        continue;
                    }
                    
                    // Create group element without attributes
                    const menuButton = document.createElement("aie-group") as Group;
                    
                    // Add class after creation
                    menuButton.classList.add("aie-menu-item");

                    if (typeof menuButton.onCreate === 'function') {
                        menuButton.onCreate(event, options);
                        
                        if (typeof menuButton.init === 'function') {
                            menuButton.init(event, options, menuGroup);
                        }
                    } else {
                        console.warn(`Menu group doesn't have onCreate method. Check if the class extends AbstractMenuButton properly.`);
                    }

                    // Set editable property after creation
                    if (typeof menuButton.onEditableChange === 'function') {
                        menuButton.onEditableChange(!!options.editable);
                    }

                    if (menuGroup.title) {
                        const tip = t(menuGroup.title) as string;
                        if (tip) {
                            requestAnimationFrame(() => {
                                tippy(menuButton, {
                                    appendTo: () => event.editor.view.dom.closest(".aie-container")!,
                                    content: tip,
                                    theme: 'aietip',
                                    arrow: true
                                });
                            });
                        }
                    }
                    menuButtons.push(menuButton);
                }
                // custom menu
                else {
                    const customMenuConfig = toolbarKey as CustomMenu;
                    
                    // Check if custom element is defined
                    if (!customElements.get('aie-custom')) {
                        console.warn(`Custom element 'aie-custom' is not registered yet. Skipping toolbar initialization for this item.`);
                        continue;
                    }
                    
                    // Create custom element without attributes
                    const menuButton = document.createElement("aie-custom") as Custom;
                    
                    // Add class after creation
                    menuButton.classList.add("aie-menu-item");

                    // Set attributes after creation
                    requestAnimationFrame(() => {
                        if (customMenuConfig.id) {
                            menuButton.setAttribute("id", customMenuConfig.id);
                        }
                        if (customMenuConfig.className) {
                            menuButton.classList.add(customMenuConfig.className);
                        }
                    });
                    
                    if (typeof menuButton.onCreate === 'function') {
                        menuButton.onCreate(event, options);
                        
                        if (typeof menuButton.onConfig === 'function') {
                            menuButton.onConfig(customMenuConfig);
                        }
                    } else {
                        console.warn(`Custom menu doesn't have onCreate method. Check if the class extends AbstractMenuButton properly.`);
                    }

                    // Set editable property after creation
                    if (typeof menuButton.onEditableChange === 'function') {
                        menuButton.onEditableChange(!!options.editable);
                    }

                    if (customMenuConfig.tip) {
                        const tip = t(customMenuConfig.tip) as string;
                        if (tip) {
                            requestAnimationFrame(() => {
                                tippy(menuButton, {
                                    appendTo: () => event.editor.view.dom.closest(".aie-container")!,
                                    content: tip,
                                    theme: 'aietip',
                                    arrow: true
                                });
                            });
                        }
                    }

                    if (customMenuConfig.onCreate) {
                        customMenuConfig.onCreate(menuButton, (event.editor as InnerEditor).aiEditor);
                    }

                    menuButtons.push(menuButton);
                }
            }
        } catch (e) {
            console.error(e, "Can not create toolbar by key: " + toolbarKey);
        }
    }
}
