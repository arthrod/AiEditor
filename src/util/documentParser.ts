/**
 * Document Parser Utility
 * Provides functions to extract content from various document formats
 */
import * as pdfjsLib from 'pdfjs-dist';
import { OPS } from 'pdfjs-dist';

// Worker configuration is handled by FileUploadExt
// Do not set pdfjsLib.GlobalWorkerOptions.workerSrc here

/**
 * Get file type from MIME type or extension
 */
export const getFileType = (file: File): string => {
    // Get by MIME type
    if (file.type) {
        const mimeType = file.type.toLowerCase();
        if (mimeType.includes('pdf')) return 'pdf';
        if (mimeType.includes('rtf')) return 'rtf';
        if (mimeType.includes('word') || mimeType.includes('docx') || mimeType.includes('doc')) return 'word';
        if (mimeType.includes('text/plain')) return 'text';
        if (mimeType.includes('text/html') || mimeType.includes('xml')) return 'html';
        if (mimeType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') || 
            mimeType.includes('application/vnd.ms-excel')) return 'excel';
    }
    
    // Fallback to extension
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.pdf')) return 'pdf';
    if (fileName.endsWith('.rtf')) return 'rtf';
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'word';
    if (fileName.endsWith('.txt')) return 'text';
    if (fileName.endsWith('.html') || fileName.endsWith('.htm')) return 'html';
    if (fileName.endsWith('.xml')) return 'xml';
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return 'excel';
    if (fileName.endsWith('.csv')) return 'csv';
    
    return 'unknown';
};

/**
 * Extract text and images from PDF using PDF.js
 */
export const extractPdfText = async (file: File): Promise<ExtractResult> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                // Check if worker is configured
                if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                    console.warn('PDF.js worker not configured! Extraction may fail.');
                }
                
                // Load the PDF document
                const loadingTask = pdfjsLib.getDocument(new Uint8Array(reader.result as ArrayBuffer));
                const pdf = await loadingTask.promise;
                
                let extractedText = `# ${file.name}\n\n`;
                const extractedImages: Array<{src: string, alt: string, editable?: boolean}> = [];
                
                // Get total page count
                const numPages = pdf.numPages;
                extractedText += `*Document with ${numPages} page${numPages > 1 ? 's' : ''}*\n\n`;
                
                // Process each page
                for (let i = 1; i <= numPages; i++) {
                    try {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        
                        if (numPages > 1) {
                            extractedText += `## Page ${i}\n\n`;
                        }
                        
                        // Extract and format text items
                        let lastY = -1;
                        let text = '';
                        
                        for (const item of content.items) {
                            if ('str' in item) {
                                // Add newline when Y position changes significantly
                                if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
                                    text += '\n';
                                }
                                text += item.str + ' ';
                                lastY = item.transform[5];
                            }
                        }
                        
                        extractedText += text.trim() + '\n\n';
                        
                        // Try the alternative approach: render the entire page as an image
                        try {
                            // Only render pages that might contain significant images
                            // to avoid wasting processing on pages with just text
                            const viewport = page.getViewport({ scale: 1.5 }); // Higher scale for better quality
                            
                            // Create a canvas for rendering the PDF page
                            const canvas = document.createElement('canvas');
                            canvas.width = viewport.width;
                            canvas.height = viewport.height;
                            
                            const ctx = canvas.getContext('2d');
                            if (!ctx) continue;
                            
                            // Render the PDF page to the canvas
                            await page.render({
                                canvasContext: ctx,
                                viewport: viewport
                            }).promise;
                            
                            // Convert the rendered page to an image
                            const pageImageUrl = canvas.toDataURL('image/jpeg', 0.8);
                            
                            // Add to extracted images
                            extractedImages.push({
                                src: pageImageUrl,
                                alt: `Page ${i} from ${file.name}`,
                                editable: true
                            });
                            
                            // Add image placeholder
                            extractedText += `[IMAGE_PLACEHOLDER_${extractedImages.length - 1}]\n\n`;
                            
                            // Clean up
                            canvas.width = 1;
                            canvas.height = 1;
                            
                            console.log(`Successfully rendered page ${i} as image`);
                        } catch (renderError) {
                            console.error(`Error rendering page ${i} as image:`, renderError);
                        }
                        
                        // Also try the object extraction method as backup
                        try {
                            // Get the operatorList to extract images
                            const operatorList = await page.getOperatorList();
                            
                            // Iterate through operations to find images
                            for (let j = 0; j < operatorList.fnArray.length; j++) {
                                if (operatorList.fnArray[j] === OPS.paintImageXObject) {
                                    const imgIndex = operatorList.argsArray[j][0];
                                    const img = page.objs.get(imgIndex);
                                    
                                    if (!img) continue;
                                    
                                    try {
                                        const canvas = document.createElement('canvas');
                                        canvas.width = img.width;
                                        canvas.height = img.height;
                                        
                                        const ctx = canvas.getContext('2d', { alpha: false });
                                        if (!ctx) continue;
                                        
                                        // Fill with white background
                                        ctx.fillStyle = '#FFFFFF';
                                        ctx.fillRect(0, 0, img.width, img.height);
                                        
                                        // Check if image data exists and has the right format
                                        if (!img.data) {
                                            console.warn(`Image data is missing for image in PDF (page ${i})`);
                                            continue;
                                        }
                                        
                                        // Create and process the image data
                                        try {
                                            const imgData = ctx.createImageData(img.width, img.height);
                                            
                                            // Handle different image data formats
                                            if (img.data instanceof Uint8ClampedArray || img.data instanceof Uint8Array) {
                                                imgData.data.set(img.data);
                                            } else if (Array.isArray(img.data)) {
                                                // If it's an array, manually copy the data
                                                for (let p = 0; p < img.data.length && p < imgData.data.length; p++) {
                                                    imgData.data[p] = img.data[p];
                                                }
                                            } else {
                                                console.warn(`Unknown image data format in PDF: ${typeof img.data}`);
                                                continue;
                                            }
                                            
                                            ctx.putImageData(imgData, 0, 0);
                                        } catch (dataError) {
                                            console.error('Error processing image data:', dataError);
                                            continue;
                                        }
                                        
                                        // Skip very small images (likely icons or artifacts)
                                        if (img.width < 50 || img.height < 50) {
                                            continue;
                                        }
                                        
                                        // Convert to data URL
                                        let imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                                        
                                        // Add image to extracted images
                                        extractedImages.push({
                                            src: imageDataUrl,
                                            alt: `Image from ${file.name} page ${i}`,
                                            editable: true
                                        });
                                        
                                        // Add image placeholder in text
                                        extractedText += `[IMAGE_PLACEHOLDER_${extractedImages.length - 1}]\n\n`;
                                        
                                        // Clean up
                                        canvas.width = 1;
                                        canvas.height = 1;
                                    } catch (imgError) {
                                        console.error('Error extracting image:', imgError);
                                    }
                                }
                            }
                        } catch (imgExtractionError) {
                            console.error(`Error extracting images from page ${i}:`, imgExtractionError);
                        }
                    } catch (error) {
                        console.error(`Error extracting page ${i}:`, error);
                        extractedText += `[Error extracting page ${i}]\n\n`;
                    }
                }
                
                resolve({
                    text: extractedText,
                    images: extractedImages
                });
            } catch (error) {
                console.error('PDF extraction error:', error);
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Extract text from a plain text file
 */
export const extractTextFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const content = reader.result as string;
            const formatted = `# ${file.name}\n\n${content}`;
            resolve(formatted);
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

/**
 * Extract text from HTML file
 */
export const extractHtmlFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const html = reader.result as string;
                
                // Create a DOM parser
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // Extract title
                const title = doc.title || file.name;
                
                // Extract main content (prioritize article, main, or body)
                const mainContent = 
                    doc.querySelector('article')?.textContent || 
                    doc.querySelector('main')?.textContent || 
                    doc.querySelector('body')?.textContent || '';
                
                // Format the content
                const formatted = `# ${title}\n\n${mainContent.trim().replace(/\s+/g, ' ')}`;
                resolve(formatted);
            } catch (error) {
                console.error('HTML extraction error:', error);
                // Return simple cleaned HTML as fallback
                const html = reader.result as string;
                const cleaned = html.replace(/<[^>]*>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                resolve(`# ${file.name}\n\n${cleaned}`);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

/**
 * Extract content from CSV file
 */
export const extractCsvFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const csv = reader.result as string;
                const lines = csv.split('\n');
                
                // Format as markdown table if possible
                if (lines.length > 0) {
                    const headers = lines[0].split(',').map(h => h.trim());
                    let markdown = `# ${file.name}\n\n`;
                    
                    // Add table headers
                    markdown += '| ' + headers.join(' | ') + ' |\n';
                    // Add separator row
                    markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
                    
                    // Add data rows (up to 20 rows to avoid extremely large tables)
                    const maxRows = Math.min(lines.length, 21);
                    for (let i = 1; i < maxRows; i++) {
                        if (lines[i].trim()) {
                            const cells = lines[i].split(',').map(c => c.trim());
                            markdown += '| ' + cells.join(' | ') + ' |\n';
                        }
                    }
                    
                    // Add note if truncated
                    if (lines.length > 21) {
                        markdown += `\n*Table truncated. Full CSV has ${lines.length - 1} rows.*\n`;
                    }
                    
                    resolve(markdown);
                } else {
                    resolve(`# ${file.name}\n\n*Empty or invalid CSV file*`);
                }
            } catch (error) {
                console.error('CSV extraction error:', error);
                resolve(`# ${file.name}\n\n*Error parsing CSV file*`);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

/**
 * Extract content from a file based on its type
 * Returns both text and images
 */
export interface ExtractResult {
    text: string;
    images: Array<{
        src: string;
        alt: string;
        editable?: boolean;
    }>;
}

export const extractFileContent = async (
    file: File, 
    options?: {
        extractContent?: boolean,
        maxExtractSize?: number,
        preserveFormatting?: boolean,
        includeImageReferences?: boolean
    }
): Promise<ExtractResult> => {
    const fileType = getFileType(file);
    
    try {
        // Check file size limits
        const maxFileSizeMB = options?.maxExtractSize ? options.maxExtractSize / (1024 * 1024) : 10;
        const fileSizeMB = file.size / (1024 * 1024);
        
        // If file is extremely large, return an early warning
        if (fileSizeMB > maxFileSizeMB) {
            return { 
                text: `File too large to extract (${Math.round(fileSizeMB)}MB). Maximum size is ${maxFileSizeMB}MB.`, 
                images: [] 
            };
        }
        
        // Return empty images array for now - actual image extraction is done in FileUploadExt
        // This is just to make the interface compatible
        switch (fileType) {
            case 'pdf':
                // PDF extraction is handled in FileUploadExt for complete implementation
                const pdfText = await extractPdfText(file);
                return { text: pdfText.text, images: pdfText.images };
                
            case 'text':
                const textContent = await extractTextFile(file);
                return { text: textContent, images: [] };
                
            case 'html':
                const htmlContent = await extractHtmlFile(file);
                return { text: htmlContent, images: [] };
                
            case 'csv':
                const csvContent = await extractCsvFile(file);
                return { text: csvContent, images: [] };
                
            default:
                return { 
                    text: `Unsupported file type for extraction: ${fileType}. File: ${file.name}`, 
                    images: [] 
                };
        }
    } catch (error) {
        console.error('Error extracting file content:', error);
        return { 
            text: `Error extracting content: ${error instanceof Error ? error.message : String(error)}`, 
            images: [] 
        };
    }
} 