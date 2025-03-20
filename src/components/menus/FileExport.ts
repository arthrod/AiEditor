import { AiEditor } from "../../core/AiEditor";

/**
 * FileExport Component
 * Provides a UI for exporting editor content in various formats
 */
export class FileExport extends HTMLElement {
    private editor: AiEditor | null = null;
    private dropdown: HTMLDivElement | null = null;
    private isOpen: boolean = false;

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Create styles
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: inline-block;
                position: relative;
            }
            
            .file-export-button {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 4px 8px;
                background: var(--aie-toolbar-btn-bg, transparent);
                border: none;
                border-radius: 4px;
                cursor: pointer;
                color: var(--aie-toolbar-color, #333);
                transition: background-color 0.2s;
            }
            
            .file-export-button:hover {
                background: var(--aie-toolbar-btn-hover-bg, rgba(0, 0, 0, 0.05));
            }
            
            .file-export-dropdown {
                position: absolute;
                top: 100%;
                left: 0;
                z-index: 1000;
                min-width: 180px;
                background: var(--aie-dropdown-bg, #fff);
                border: 1px solid var(--aie-border-color, #ddd);
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                display: none;
                padding: 4px 0;
            }
            
            .file-export-dropdown.open {
                display: block;
            }
            
            .file-export-item {
                display: flex;
                align-items: center;
                padding: 8px 12px;
                cursor: pointer;
                color: var(--aie-dropdown-color, #333);
                font-size: 14px;
                transition: background-color 0.2s;
            }
            
            .file-export-item:hover {
                background: var(--aie-dropdown-item-hover-bg, rgba(0, 0, 0, 0.05));
            }
            
            .file-export-item svg {
                margin-right: 8px;
            }
        `;
        
        // Create button
        const button = document.createElement('button');
        button.className = 'file-export-button';
        button.setAttribute('title', 'Export File');
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M13 14H11V8H8L12 4L16 8H13V14ZM4 16V19H20V16H22V21H2V16H4Z"></path>
            </svg>
        `;
        
        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'file-export-dropdown';
        this.dropdown = dropdown;
        
        // Add export options
        const exportFormats = [
            { id: 'html', name: 'HTML', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 18.1778L7.38083 20L8.10583 15.0153L4.21167 11.4347L9.19083 10.8333L12 6.22222L14.8092 10.8333L19.7883 11.4347L15.8942 15.0153L16.6192 20L12 18.1778Z"></path></svg>' },
            { id: 'markdown', name: 'Markdown', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM4 5V19H20V5H4ZM8.5 14H6.5V10H8.5V14ZM8.5 9H6.5V7H8.5V9ZM12.5 14H10.5V7H12.5V14ZM16.5 14H14.5V10H16.5V14ZM16.5 9H14.5V7H16.5V9Z"></path></svg>' },
            { id: 'text', name: 'Plain Text', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.8906 5C12.7458 5 12.607 5.04566 12.4938 5.12927L5.5 10.6365V11H11V18.7508L12.4938 19.8707C12.607 19.9543 12.7458 20 12.8906 20H13H19C19.5523 20 20 19.5523 20 19V6C20 5.44772 19.5523 5 19 5H13H12.8906ZM12 17.2674V12H18V18H13.7898L12 17.2674ZM12 10V7H18V10H12ZM10.5 16H5V15H10.5V16ZM10.5 13H5V12H10.5V13ZM10.5 10H7.50006L10.5 7.70758V10Z"></path></svg>' },
            { id: 'json', name: 'JSON', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M5 3H7V21H5V3ZM12 18.17L8.83 15L12 11.83L14.17 14L18 10.17V15H20V8L14.17 13.83L12 11.66L8 15.66L10 17.66L12 15.66V18.17Z"></path></svg>' },
            { id: 'pdf', name: 'PDF', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.9119 7.70813C12.2828 6.38888 12.6457 5.59354 12.9153 5.00751C12.957 4.93144 12.9887 4.86177 13.0069 4.8018L13.0071 4.80157C13.0317 4.72206 13.0523 4.65519 13.0674 4.62061C13.0765 4.60059 13.0888 4.58501 13.1028 4.57425C13.1156 4.56457 13.1478 4.54582 13.2089 4.54582C13.3563 4.54582 13.9047 4.53168 13.9047 5.88493C13.9047 7.30126 13.2323 7.91187 12.9119 7.70813ZM12.6602 9.77941C12.3952 9.6192 12.1281 9.46008 11.8876 9.2734C10.9631 8.57935 10.2103 7.73892 9.92282 7.40382L9.92282 7.40382C9.77732 7.23495 9.68526 7.12635 9.64761 7.07872C9.5872 6.9998 9.53507 6.89897 9.52154 6.84584C9.51592 6.82328 9.51404 6.81454 9.51294 6.8093C9.51222 6.80585 9.51228 6.80709 9.51225 6.80653C9.51224 6.8063 9.51224 6.80624 9.51224 6.80626C9.51224 6.80625 9.51224 6.80625 9.51224 6.80626C9.51224 6.80626 9.51224 6.80626 9.51224 6.80626C9.51224 6.80626 9.51224 6.80624 9.51224 6.80625C9.51224 6.80629 9.51222 6.80632 9.51222 6.80636C9.51222 6.80646 9.51196 6.80668 9.51243 6.80704C9.51327 6.80772 9.51491 6.80881 9.51815 6.80954C9.53083 6.81267 9.59404 6.82088 9.78048 6.88395C9.85021 6.90917 9.89779 6.9253 9.92984 6.93606C10.0188 6.96594 10.0636 6.9838 10.0926 7.00273C10.1414 7.03402 10.1823 7.07818 10.2105 7.13077C10.2323 7.17148 10.2493 7.22672 10.2465 7.33252C10.2459 7.35329 10.2445 7.37021 10.2431 7.38561C10.2403 7.41677 10.2369 7.45337 10.2289 7.50372C10.2125 7.60775 10.1837 7.72962 10.127 7.89466L10.1269 7.89485C10.0397 8.14652 9.89842 8.51497 9.93387 8.6707C9.97245 8.83839 10.167 8.92466 10.3069 8.99168C10.3326 9.00257 10.3565 9.01274 10.3779 9.02314C12.7031 10.2435 14.0612 13.0661 13.3497 13.4526C12.5736 13.8782 11.2182 11.4175 11.0536 11.103C10.9679 10.9322 10.8693 10.7565 10.7686 10.5788C10.2944 9.82729 9.79604 9.05141 10.4437 8.87251C10.6431 8.82088 10.8381 8.89636 11.0308 8.9712C11.1271 9.00742 11.2223 9.04326 11.3166 9.06435C11.5665 9.12229 11.8248 9.18402 12.0809 9.25203C12.2678 9.30256 12.4553 9.35861 12.6414 9.41832C12.6477 9.42 12.654 9.42185 12.6602 9.42387V9.77941ZM8.46779 14.7949C8.44335 14.794 8.40779 14.7973 8.34413 14.8081C8.1789 14.8386 7.9549 14.9164 7.61517 15.0661C7.35687 15.1825 7.17051 15.2697 7.04023 15.3359C6.99069 15.3636 6.94963 15.388 6.91776 15.4083C6.88477 15.4294 6.86175 15.4473 6.8503 15.457C6.83557 15.4694 6.82611 15.4838 6.82196 15.5008C6.81735 15.5196 6.81807 15.548 6.83939 15.5934C6.85975 15.6364 6.89287 15.675 6.93446 15.6998C6.97521 15.7241 7.02222 15.738 7.06926 15.7462C7.10117 15.7521 7.13075 15.7539 7.15298 15.754C7.17132 15.7543 7.18604 15.7535 7.19543 15.7526C7.20018 15.752 7.20361 15.7514 7.20568 15.7511L7.20768 15.7507L7.20798 15.7507C7.2083 15.7506 7.20798 15.7507 7.20798 15.7507C7.33525 15.7507 7.7283 15.7512 8.31274 15.6198C8.90666 15.4865 9.14084 15.0549 8.95678 14.8928C8.76781 14.7269 8.51597 14.7964 8.46779 14.7949ZM4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM10.6204 16.169C9.66135 16.169 9.28207 15.1848 9.72717 14.7391L9.72744 14.7389C10.1726 14.2931 10.8764 14.415 11.6099 14.5445L11.6111 14.5448C11.6909 14.5607 11.7721 14.5769 11.8539 14.592C12.095 14.6358 12.3424 14.678 12.5652 14.6871C13.004 14.7051 13.4571 14.6391 13.7736 14.5233C14.5953 14.2336 15.1638 13.8546 15.3683 13.6783C15.4707 13.5901 15.5266 13.5401 15.5495 13.5224L15.5516 13.5208C15.5519 13.5204 15.5521 13.5202 15.5516 13.5207C15.5508 13.5215 15.5491 13.5231 15.5483 13.5239C15.5472 13.525 15.5472 13.525 15.5473 13.5248C15.5477 13.5245 15.5492 13.5231 15.5516 13.5208L15.5517 13.5208C15.9531 13.1711 16.0388 15.4737 15.0617 15.9879C14.0845 16.5022 13.6844 15.9879 13.4343 15.9879C13.1843 15.9879 13.0092 16.6879 12.0057 16.6879C10.7011 16.6879 10.6204 16.169 10.6204 16.169ZM12.2203 13.63C12.9511 13.63 13.5468 13.4939 14.3011 12.9653C15.6099 12.0766 15.6099 10.0594 14.8792 8.12618C14.148 6.1938 13.4174 5.00001 13.4174 5.00001C13.4174 5.00001 12.6868 7.87762 13.4174 9.3112C13.787 10.0169 14.7774 10.2984 14.3011 11.1879C13.8249 12.0775 13.1706 12.5566 12.2203 12.5566C11.2696 12.5566 11.4549 13.63 12.2203 13.63ZM7.06863 13.3358C7.84125 13.3358 8.06806 13.7257 8.06806 14.1156C8.06806 14.5054 7.55249 15.3793 6.47835 15.3793C5.40337 15.3793 5.22656 14.0196 5.22656 14.0196C5.22656 14.0196 6.29658 13.3358 7.06863 13.3358Z"></path></svg>' }
        ];
        
        exportFormats.forEach(format => {
            const item = document.createElement('div');
            item.className = 'file-export-item';
            item.innerHTML = `${format.icon} ${format.name}`;
            item.addEventListener('click', () => this.exportContent(format.id));
            dropdown.appendChild(item);
        });
        
        // Add event listeners
        button.addEventListener('click', () => this.toggleDropdown());
        document.addEventListener('click', (e) => {
            if (!this.contains(e.target as Node)) {
                this.closeDropdown();
            }
        });
        
        // Append elements to shadow root
        this.shadowRoot!.appendChild(style);
        this.shadowRoot!.appendChild(button);
        this.shadowRoot!.appendChild(dropdown);
    }
    
    connectedCallback() {
        // Find the editor instance
        const editorId = this.getAttribute('editor') || '';
        if (editorId) {
            // @ts-ignore
            this.editor = window[editorId];
        } else {
            // Look for the first editor instance
            // @ts-ignore
            this.editor = window.aiEditor;
        }
        
        if (!this.editor) {
            console.error('FileExport: No editor instance found');
        }
    }
    
    /**
     * Toggle the dropdown menu
     */
    toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }
    
    /**
     * Open the dropdown menu
     */
    openDropdown() {
        if (this.dropdown) {
            this.dropdown.classList.add('open');
            this.isOpen = true;
        }
    }
    
    /**
     * Close the dropdown menu
     */
    closeDropdown() {
        if (this.dropdown) {
            this.dropdown.classList.remove('open');
            this.isOpen = false;
        }
    }
    
    /**
     * Export content in the specified format
     */
    exportContent(format: string) {
        if (!this.editor) {
            console.error('FileExport: No editor instance found');
            return;
        }
        
        const date = new Date().toISOString().split('T')[0];
        let content: string;
        let mimeType: string;
        let filename: string;
        
        switch (format) {
            case 'html':
                content = this.editor.getHTML();
                mimeType = 'text/html';
                filename = `document-${date}.html`;
                break;
                
            case 'markdown':
                // Try to get markdown from the editor
                if (this.editor.innerEditor.storage.markdown) {
                    content = this.editor.innerEditor.storage.markdown.getMarkdown();
                } else {
                    content = this.convertToMarkdown(this.editor.getHTML());
                }
                mimeType = 'text/markdown';
                filename = `document-${date}.md`;
                break;
                
            case 'text':
                content = this.editor.getText();
                mimeType = 'text/plain';
                filename = `document-${date}.txt`;
                break;
                
            case 'json':
                content = JSON.stringify(this.editor.getJson(), null, 2);
                mimeType = 'application/json';
                filename = `document-${date}.json`;
                break;
                
            case 'pdf':
                // For PDF, we need to create a print version and convert it
                this.exportToPdf();
                this.closeDropdown();
                return;
                
            default:
                console.error(`FileExport: Unknown format "${format}"`);
                return;
        }
        
        // Create blob and download
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        this.closeDropdown();
    }
    
    /**
     * Export to PDF using the browser's print dialog
     */
    exportToPdf() {
        if (!this.editor) return;
        
        // Use the editor's print function if available
        if (typeof this.editor.printContent === 'function') {
            this.editor.printContent();
        } else {
            // Create a new window with just the content for printing
            const content = this.editor.getHTML();
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
                alert('Please allow popups to print the document');
                return;
            }
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print Document</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.5; padding: 20px; }
                        h1, h2, h3, h4, h5, h6 { margin-top: 1em; margin-bottom: 0.5em; }
                        p { margin-bottom: 1em; }
                        code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
                        pre { background: #f0f0f0; padding: 10px; border-radius: 3px; overflow-x: auto; }
                        table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        img { max-width: 100%; height: auto; }
                        @media print {
                            @page { margin: 2cm; }
                            body { font-size: 12pt; }
                            a[href]::after { content: " (" attr(href) ")"; }
                        }
                    </style>
                </head>
                <body>
                    ${content}
                    <script>
                        window.onload = function() {
                            window.print();
                            window.setTimeout(function() { window.close(); }, 500);
                        };
                    </script>
                </body>
                </html>
            `);
            
            printWindow.document.close();
        }
    }
    
    /**
     * Simple HTML to Markdown converter
     * (This is a very basic implementation, ideally use a library like Turndown)
     */
    convertToMarkdown(html: string): string {
        // Create a DOM parser
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Simple recursive function to convert HTML to Markdown
        const convert = (node: Node, level: number = 0): string => {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent || '';
            }
            
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return '';
            }
            
            const element = node as HTMLElement;
            let result = '';
            
            switch (element.tagName.toLowerCase()) {
                case 'h1':
                    return `# ${this.innerTextToMarkdown(element)}\n\n`;
                case 'h2':
                    return `## ${this.innerTextToMarkdown(element)}\n\n`;
                case 'h3':
                    return `### ${this.innerTextToMarkdown(element)}\n\n`;
                case 'h4':
                    return `#### ${this.innerTextToMarkdown(element)}\n\n`;
                case 'h5':
                    return `##### ${this.innerTextToMarkdown(element)}\n\n`;
                case 'h6':
                    return `###### ${this.innerTextToMarkdown(element)}\n\n`;
                case 'p':
                    return `${this.childrenToMarkdown(element)}\n\n`;
                case 'strong':
                case 'b':
                    return `**${this.innerTextToMarkdown(element)}**`;
                case 'em':
                case 'i':
                    return `*${this.innerTextToMarkdown(element)}*`;
                case 'u':
                    return `<u>${this.innerTextToMarkdown(element)}</u>`;
                case 'code':
                    return element.parentElement?.tagName.toLowerCase() === 'pre' 
                        ? this.innerTextToMarkdown(element)
                        : `\`${this.innerTextToMarkdown(element)}\``;
                case 'pre':
                    // Determine language if possible
                    const langMatch = element.className.match(/language-([^\s]+)/);
                    const lang = langMatch ? langMatch[1] : '';
                    return `\`\`\`${lang}\n${this.innerTextToMarkdown(element)}\n\`\`\`\n\n`;
                case 'a':
                    return `[${this.innerTextToMarkdown(element)}](${element.getAttribute('href') || ''})`;
                case 'img':
                    return `![${element.getAttribute('alt') || ''}](${element.getAttribute('src') || ''})`;
                case 'ul':
                    return this.listToMarkdown(element, '*') + '\n';
                case 'ol':
                    return this.listToMarkdown(element, '1.') + '\n';
                case 'li':
                    // This shouldn't be called directly, it's handled by listToMarkdown
                    return '';
                case 'blockquote':
                    // Split by newlines and prefix each line with >
                    const blockquoteContent = this.childrenToMarkdown(element);
                    return blockquoteContent.split('\n')
                        .map(line => `> ${line}`)
                        .join('\n') + '\n\n';
                case 'hr':
                    return '---\n\n';
                case 'br':
                    return '\n';
                case 'table':
                    return this.tableToMarkdown(element) + '\n\n';
                default:
                    // For other elements, just process their children
                    return this.childrenToMarkdown(element);
            }
        };
        
        // Process the body
        let markdown = '';
        const body = doc.body;
        for (let i = 0; i < body.childNodes.length; i++) {
            markdown += convert(body.childNodes[i]);
        }
        
        return markdown.trim();
    }
    
    /**
     * Convert inner text of an element to markdown
     */
    private innerTextToMarkdown(element: HTMLElement): string {
        return element.innerText || '';
    }
    
    /**
     * Convert children of an element to markdown
     */
    private childrenToMarkdown(element: HTMLElement): string {
        let result = '';
        for (let i = 0; i < element.childNodes.length; i++) {
            const child = element.childNodes[i];
            if (child.nodeType === Node.TEXT_NODE) {
                result += child.textContent || '';
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const el = child as HTMLElement;
                
                switch (el.tagName.toLowerCase()) {
                    case 'strong':
                    case 'b':
                        result += `**${this.innerTextToMarkdown(el)}**`;
                        break;
                    case 'em':
                    case 'i':
                        result += `*${this.innerTextToMarkdown(el)}*`;
                        break;
                    case 'u':
                        result += `<u>${this.innerTextToMarkdown(el)}</u>`;
                        break;
                    case 'code':
                        result += `\`${this.innerTextToMarkdown(el)}\``;
                        break;
                    case 'a':
                        result += `[${this.innerTextToMarkdown(el)}](${el.getAttribute('href') || ''})`;
                        break;
                    case 'br':
                        result += '\n';
                        break;
                    default:
                        result += this.innerTextToMarkdown(el);
                }
            }
        }
        return result;
    }
    
    /**
     * Convert list to markdown
     */
    private listToMarkdown(list: HTMLElement, marker: string): string {
        let result = '';
        const items = list.querySelectorAll('li');
        items.forEach((item, index) => {
            const prefix = marker === '1.' ? `${index + 1}.` : marker;
            result += `${prefix} ${this.innerTextToMarkdown(item)}\n`;
        });
        return result;
    }
    
    /**
     * Convert table to markdown
     */
    private tableToMarkdown(table: HTMLElement): string {
        const rows = table.querySelectorAll('tr');
        if (rows.length === 0) return '';
        
        let result = '';
        let headerProcessed = false;
        
        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('th, td');
            if (cells.length === 0) return;
            
            // Process cells
            const line = Array.from(cells)
                .map(cell => this.innerTextToMarkdown(cell as HTMLElement))
                .join(' | ');
                
            result += `| ${line} |\n`;
            
            // Add header separator
            if (rowIndex === 0 && !headerProcessed) {
                result += `| ${Array(cells.length).fill('---').join(' | ')} |\n`;
                headerProcessed = true;
            }
        });
        
        return result;
    }
}

// Register the custom element
customElements.define('aie-file-export', FileExport); 