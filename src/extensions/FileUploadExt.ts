import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { TextSelection } from "prosemirror-state";
import { DecorationSet } from "prosemirror-view";
import { Uploader, UploaderEvent } from "../core/AiEditor.ts";
import { createAttachmentDecoration, createMediaDecoration } from "../util/decorations.ts";
import { getUploader } from "../util/getUploader.ts";
// Import PDF.js for PDF parsing
import * as pdfjsLib from 'pdfjs-dist';
// Import mammoth for Word docs
import mammoth from 'mammoth';
// RTF parsing is disabled for now as it requires CommonJS environment
// We'll skip RTF parsing and fall back to upload
// Also add the Editor type from tiptap
import type { Editor } from '@tiptap/core';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        FileUpload: {
            uploadFile: (file: File) => ReturnType;
        };
    }
}

// First let's extend the UploaderEvent interface to include the missing properties
interface ExtendedUploaderEvent extends UploaderEvent {
    onUploadSuccess?: (file: File, result: any) => void;
    onUploadAfter?: (file: File, result: any) => void;
}

export interface FileUploadOptions {
    uploadUrl?: string,
    uploadHeaders?: (() => Record<string, any>) | Record<string, any>,
    uploader?: Uploader,
    uploaderEvent?: ExtendedUploaderEvent, // Use extended interface
    uploadFormName?: string,
    // Document parsing options
    extractContent?: boolean, // Whether to extract content from files
    maxExtractSize?: number, // Maximum file size for content extraction (in bytes)
    supportedFormats?: string[], // Supported formats for content extraction
    parseMode?: 'auto' | 'ask' | 'always' | 'never', // How to handle parseable documents
    // Advanced formatting options
    preserveFormatting?: boolean, // Whether to preserve document formatting (default true)
    includeImageReferences?: boolean, // Whether to include references to images (default true)
    preserveDocumentStructure?: boolean, // Whether to preserve document structure like headings, lists, etc. (default true)
    maxExtractedContentSize?: number, // Maximum content size to extract (in characters, default 100000)
    // PDF.js configuration - custom path overrides the CDN
    pdfWorkerSrc?: string, // Custom path to the PDF.js worker file
    offlineWorkerPath?: string, // Path to local worker file for offline use
    preferOffline?: boolean, // Whether to prefer offline mode even when online
    maxImageSize?: number, // Maximum image size for optimization (in KB)
    uploadFn?: (dataUrl: string) => Promise<string>, // Custom upload function
    handleImageFiles?: boolean, // Whether to handle image files (default true)
    handleOtherFiles?: boolean, // Whether to handle other files (default true)
    maxFileSize?: number, // Maximum file size for uploads (default 10MB)
}

const actionKey = new PluginKey("file_upload_action");

// Helper function to get the file type from MIME type or extension
const getFileType = (file: File): string => {
    // Get by MIME type
    if (file.type) {
        const mimeType = file.type.toLowerCase();
        if (mimeType.includes('pdf')) return 'pdf';
        if (mimeType.includes('rtf')) return 'rtf';
        if (mimeType.includes('word') || mimeType.includes('docx') || mimeType.includes('doc')) return 'word';
        if (mimeType.includes('text/plain')) return 'text';
        if (mimeType.includes('text/html') || mimeType.includes('xml')) return 'html';
    }
    
    // Fallback to extension
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.pdf')) return 'pdf';
    if (fileName.endsWith('.rtf')) return 'rtf';
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'word';
    if (fileName.endsWith('.txt')) return 'text';
    if (fileName.endsWith('.html') || fileName.endsWith('.htm') || fileName.endsWith('.xml')) return 'html';
    
    return 'unknown';
};

// Utility function to check if PDF extraction is available
const isPdfExtractionAvailable = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
        return !!pdfjsLib && !!pdfjsLib.getDocument && !!pdfjsLib.GlobalWorkerOptions.workerSrc;
    } catch (e) {
        return false;
    }
};

// Helper function to convert image data to a data URL
const createImageDataUrl = (imageData: Uint8ClampedArray, width: number, height: number): string => {
    // Create a canvas to draw the image data
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    // Get the canvas context and create an ImageData object
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    // Create an ImageData object
    const imgData = ctx.createImageData(width, height);
    imgData.data.set(imageData);
    
    // Put the image data on the canvas
    ctx.putImageData(imgData, 0, 0);
    
    // Convert the canvas to a data URL
    return canvas.toDataURL('image/png');
};

// Define the ExtractResult type to match documentParser.ts
interface ExtractResult {
    text: string;
    images: Array<{
        src: string;
        alt: string;
        editable?: boolean;
    }>;
}

// Improve the getImageHash function to be more accurate
const getImageHash = (src: string): string => {
    // For data URLs, use a portion of the data to create a hash
    if (src.startsWith('data:')) {
        // Extract the mime type part for better hashing
        const mimeType = src.split(';')[0] || 'data:image/png';
        
        // Take the first 100 and last 100 characters of the data part as the hash
        const dataPart = src.split(',')[1] || '';
        
        // For very short data URLs, use the entire string
        if (dataPart.length <= 200) {
            return dataPart;
        }
        
        // For longer data URLs, sample from different parts for better uniqueness detection
        // Take samples from beginning, middle, and end
        const begin = dataPart.substring(0, 50);
        const middle = dataPart.substring(Math.floor(dataPart.length / 2) - 25, Math.floor(dataPart.length / 2) + 25);
        const end = dataPart.substring(dataPart.length - 50);
        
        return mimeType + ':' + begin + middle + end;
    }
    
    // For regular URLs, use the URL itself
    return src;
};

// Helper function to add a simple signature to image data
const addImageSignature = async (dataUrl: string, pageNum: number, imageNum: number): Promise<string> => {
    // If it's not a base64 image, return as is
    if (!dataUrl.startsWith('data:image/')) {
        return dataUrl;
    }
    
    try {
        // Create a canvas to add a small signature
        const img = new Image();
        return new Promise<string>((resolve) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(dataUrl);
                    return;
                }
                
                // Draw the original image
                ctx.drawImage(img, 0, 0);
                
                // Add a subtle 1-pixel signature in the bottom-right corner
                // This helps with duplicate detection without affecting the image visually
                ctx.fillStyle = `rgba(${pageNum}, ${imageNum}, 0, 0.01)`;
                ctx.fillRect(canvas.width - 2, canvas.height - 2, 1, 1);
                
                resolve(canvas.toDataURL(dataUrl.split(';')[0].replace('data:', '') || 'image/png'));
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        });
    } catch (e) {
        console.warn('Error adding image signature:', e);
        return dataUrl;
    }
};

// Extract text and images from a PDF file
const extractPdfText = async (
  file: File,
  progressCallback?: (progress: number) => void
): Promise<{ text: string; images: string[] }> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    const pdfDoc = await pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://unpkg.com/pdfjs-dist/cmaps/',
      cMapPacked: true,
      useSystemFonts: true,
    }).promise;
    
    const imageTracker = new Map<string, number>();
    let extractedText = '';
    const extractedImages: string[] = [];
    const totalPages = pdfDoc.numPages;
    
    // Process pages in smaller batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < totalPages; i += BATCH_SIZE) {
      const endIdx = Math.min(i + BATCH_SIZE, totalPages);
      const pagePromises = [];
      
      for (let j = i; j < endIdx; j++) {
        pagePromises.push(processPage(j + 1));
      }
      
      await Promise.all(pagePromises);
      
      if (progressCallback) {
        progressCallback((endIdx / totalPages) * 100);
      }
    }
    
    return { text: extractedText, images: extractedImages };
    
    async function processPage(pageNum: number) {
      const page = await pdfDoc.getPage(pageNum);
      
      // Extract text content
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .filter(item => 'str' in item)
        .map(item => (item as any).str)
        .join(' ');
        
      extractedText += `${pageText}\n\n`;
      
      // Extract images with optimizations
      const operatorList = await page.getOperatorList();
      
      for (let j = 0; j < operatorList.fnArray.length; j++) {
        if (operatorList.fnArray[j] === pdfjsLib.OPS.paintImageXObject) {
          const imgIndex = operatorList.argsArray[j][0];
          const img = page.objs.get(imgIndex);
          
          if (!img) continue;
          
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) continue;
            
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, img.width, img.height);
            
            const imgData = ctx.createImageData(img.width, img.height);
            imgData.data.set(img.data);
            ctx.putImageData(imgData, 0, 0);
            
            let imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            
            if (img.width < 50 || img.height < 50) {
              continue;
            }
            
            imageDataUrl = await addImageSignature(imageDataUrl, pageNum, extractedImages.length);
            imageDataUrl = await resizeImageIfNeeded(imageDataUrl);
            
            const hash = getImageHash(imageDataUrl);
            
            if (!imageTracker.has(hash)) {
              imageTracker.set(hash, extractedImages.length);
              extractedImages.push(imageDataUrl);
            }
            
            canvas.width = 1;
            canvas.height = 1;
          } catch (error) {
            console.error('Error extracting image:', error);
          }
        }
      }
      
      page.cleanup();
    }
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return { text: '', images: [] };
  }
};

// Extract content from Word documents using mammoth with image support
const extractWordDocument = async (
    file: File
): Promise<ExtractResult> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const arrayBuffer = reader.result as ArrayBuffer;
                const extractedImages: Array<{ src: string, alt: string }> = [];
                
                // Add a Map to track image hashes for deduplication
                const imageHashes = new Map<string, number>();
                
                // Custom element handler to handle images
                const elementHandlers = {
                    image: (element) => {
                        // Check if image data is available
                        if (element.src && element.src.arrayBuffer) {
                            try {
                                // Convert image data to base64
                                const base64 = arrayBufferToBase64(element.src.arrayBuffer);
                                // Determine content type (default to png if unknown)
                                const contentType = element.contentType || 'image/png';
                                // Create data URL
                                const dataUrl = `data:${contentType};base64,${base64}`;
                                
                                // Create a hash for this image
                                const imageHash = getImageHash(dataUrl);
                                
                                // Check if we've already seen this image
                                if (imageHashes.has(imageHash)) {
                                    // Reuse existing image
                                    const existingIndex = imageHashes.get(imageHash)!;
                                    console.log(`Detected duplicate Word doc image, reusing image ${existingIndex}`);
                                    // Return placeholder for the existing image
                                    return { value: `[IMAGE_PLACEHOLDER_${existingIndex}]` };
                                }
                                
                                // Add to extracted images collection (it's a new image)
                                extractedImages.push({
                                    src: dataUrl,
                                    alt: element.altText || `Image from ${file.name}`
                                });
                                
                                // Store the hash and index
                                const newIndex = extractedImages.length - 1;
                                imageHashes.set(imageHash, newIndex);
                                
                                // Return placeholder in the text
                                return { value: `[IMAGE_PLACEHOLDER_${newIndex}]` };
                            } catch (e) {
                                console.warn('Error processing image from Word document:', e);
                                return { value: '[Image]' }; // Fallback
                            }
                        }
                        return { value: '[Image]' }; // Fallback
                    }
                };
                
                // Extract content using mammoth
                const result = await mammoth.convertToHtml(
                    { arrayBuffer },
                    { 
                        elementHandlers,
                        // Add optional style mapping if needed
                        styleMap: [
                            "p[style-name='Heading 1'] => h1:fresh",
                            "p[style-name='Heading 2'] => h2:fresh",
                            "p[style-name='Heading 3'] => h3:fresh",
                            "p[style-name='Heading 4'] => h4:fresh"
                        ]
                    }
                );
                
                // Process the HTML to get plain text with minimal formatting
                const formattedText = result.value
                    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
                    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
                    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
                    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
                    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
                    .replace(/<a[^>]*href=["'](.*?)["'][^>]*>(.*?)<\/a>/gi, '$2 [$1]')
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                resolve({ text: formattedText, images: extractedImages });
            } catch (err) {
                console.error('Word document extraction failed', err);
                resolve({ text: `Error extracting from Word document: ${err instanceof Error ? err.message : String(err)}`, images: [] });
            }
        };
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
    });
};

// Helper function to convert ArrayBuffer to base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

// Extract text from a text file
const extractTextFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

// Extract RTF content - simplified version without require()
const extractRtfContent = async (file: File): Promise<string> => {
    // Since RTF parsing libraries require CommonJS, we'll just return a message for now
    return Promise.resolve(`RTF parsing not available in this environment. File: ${file.name} (${Math.round(file.size/1024)} KB)`);
};

// Helper function to check image size and resize if necessary - optimized for performance
const resizeImageIfNeeded = (dataUrl: string, maxSizeKB: number = 500): Promise<string> => {
    return new Promise((resolve) => {
        // If it's not a base64 image, return as is
        if (!dataUrl.startsWith('data:image/')) {
            resolve(dataUrl);
            return;
        }

        // Quick check based on length before processing
        if (dataUrl.length <= maxSizeKB * 1024) {
            resolve(dataUrl);
            return;
        }

        // Create an image element to load the data URL
        const img = new Image();
        img.onload = () => {
            // Calculate new dimensions while maintaining aspect ratio
            let { width, height } = img;
            
            // Optimize initial scaling decision based on image size
            const originalSize = dataUrl.length;
            const targetSize = maxSizeKB * 1024;
            const scaleFactor = Math.sqrt(targetSize / originalSize); // Square root for 2D scaling
            
            // Apply scale factor with limits
            const maxDimension = 1200; // Max width or height
            if (scaleFactor < 1) {
                // Scale down proportionally based on estimated size
                width = Math.min(maxDimension, Math.floor(width * scaleFactor));
                height = Math.min(maxDimension, Math.floor(height * scaleFactor));
            } else if (width > maxDimension || height > maxDimension) {
                // If dimensions are still excessive, scale them down
                if (width > height) {
                    height = Math.round(height * (maxDimension / width));
                    width = maxDimension;
                } else {
                    width = Math.round(width * (maxDimension / height));
                    height = maxDimension;
                }
            }
            
            // Early exit if the image is already small and we don't need to resize
            if (width === img.width && height === img.height && dataUrl.length <= maxSizeKB * 1024) {
                resolve(dataUrl);
                return;
            }
            
            // Create a canvas and draw the resized image
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for performance
            if (!ctx) {
                resolve(dataUrl); // If we can't get a context, return original
                return;
            }
            
            // Fill with white background for better JPEG compression
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            
            // Draw the image on the canvas
            ctx.drawImage(img, 0, 0, width, height);
            
            // Start with appropriate quality based on image size
            // Larger images get lower initial quality
            let quality = originalSize > 2 * 1024 * 1024 ? 0.6 : 0.8;
            
            // Try to get a compressed version
            let newDataUrl = canvas.toDataURL('image/jpeg', quality);
            
            // If still too large, reduce quality iteratively with smarter steps
            let attempts = 0;
            while (newDataUrl.length > maxSizeKB * 1024 && quality > 0.3 && attempts < 4) {
                // Adjust quality by larger steps for bigger reductions
                quality -= (newDataUrl.length / (maxSizeKB * 1024)) * 0.2;
                quality = Math.max(0.3, quality); // Don't go below 0.3
                
                newDataUrl = canvas.toDataURL('image/jpeg', quality);
                attempts++;
            }
            
            // Free up memory
            canvas.width = 1;
            canvas.height = 1;
            
            resolve(newDataUrl);
        };
        
        img.onerror = () => resolve(dataUrl); // On error, use original
        img.src = dataUrl;
    });
};

// Extract content from a file based on its type - integration with documentParser
const extractFileContent = async (
    file: File, 
    options?: FileUploadOptions
): Promise<ExtractResult> => {
    // Convert our options to documentParser options format
    const parserOptions = {
        extractContent: options?.extractContent,
        maxExtractSize: options?.maxExtractSize,
        preserveFormatting: options?.preserveFormatting,
        includeImageReferences: options?.includeImageReferences
    };

    // Use the imported function with our format conversion
    const result = await import('../util/documentParser.ts')
        .then(module => module.extractFileContent(file, parserOptions));
    
    console.log(`Extracted ${result.images?.length || 0} images from file ${file.name}`);
    
    return {
        text: result.text,
        images: result.images || []
    };
};

// Add SVG loading indicator to image processing
const loadingSpinnerSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" class="image-loading-spinner"><path fill="none" d="M0 0h24v24H0z"></path><path d="M12 3C16.9706 3 21 7.02944 21 12H19C19 8.13401 15.866 5 12 5V3Z"></path></svg>`;

// Add CSS for the loading spinner
const addSpinnerStyles = () => {
    const styleId = 'image-loading-spinner-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .image-loading-spinner {
            animation: spin 1s linear infinite;
            color: currentColor;
            display: inline-block;
            vertical-align: middle;
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .image-loading-container {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin: 0.5em;
            padding: 1em;
            background-color: rgba(0, 0, 0, 0.05);
            border-radius: 4px;
        }
    `;
    document.head.appendChild(style);
};

// Parse and insert document content - Updated to handle images
const parseAndInsertDocument = async (
    editor: any,
    file: File, 
    id: string, 
    headers: Record<string, any>,
    options: FileUploadOptions,
    extensionThis: any // Pass the entire extension context
) => {
    try {
        const {view, schema} = editor;
        const { tr } = view.state;
        
        // Extract content from the file
        const extractResult = await extractFileContent(file, options);
        const content = extractResult.text;
        const images = extractResult.images || [];
        
        console.log(`Extracted ${images.length} images from file ${file.name}`);
        
        if (content && content.length > 0) {
            // Find the decoration
            const decorationSet = actionKey.getState(view.state);
            if (!decorationSet) {
                console.warn('No decoration set found, cannot insert content');
                return;
            }
            
            // Use 0 instead of null for from/to in find method
            const found = decorationSet.find(0, view.state.doc.content.size, (spec: any) => spec.id == id);
            
            if (found && found.length) {
                const from = found[0].from;
                const to = found[0].to;
                
                // Process extracted content with better handling of formatting
                const lines = content.split('\n');
                let resultNodes = [];
                
                // Process line by line with improved formatting support
                let currentParagraphText = '';
                let inCodeBlock = false;
                let inList = false;
                let listItems: string[] = []; // Add proper type annotation
                
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    
                    // Image placeholder handling
                    if (trimmedLine.startsWith('[IMAGE_PLACEHOLDER_') && trimmedLine.endsWith(']')) {
                        console.log(`Found image placeholder: ${trimmedLine}`);
                        // Extract the image index
                        const imageIndexMatch = trimmedLine.match(/\[IMAGE_PLACEHOLDER_(\d+)\]/);
                        if (imageIndexMatch && imageIndexMatch[1]) {
                            const imageIndex = parseInt(imageIndexMatch[1], 10);
                            console.log(`Extracted image index: ${imageIndex}, available images: ${images.length}`);
                            
                            // Push any accumulated paragraph text
                            if (currentParagraphText) {
                                resultNodes.push(
                                    schema.nodes.paragraph.create({}, schema.text(currentParagraphText))
                                );
                                currentParagraphText = '';
                            }
                            
                            // Create image node if the index is valid
                            if (images && images[imageIndex]) {
                                const image = images[imageIndex];
                                
                                // Process the image before adding it to the document
                                try {
                                    // If it's a base64 image, check its size and resize if needed
                                    let imgSrc = image.src;
                                    if (imgSrc.startsWith('data:')) {
                                        // Resize images larger than 500KB (configurable)
                                        imgSrc = await resizeImageIfNeeded(imgSrc, options.maxImageSize || 500);
                                    }
                                    
                                    console.log(`Adding image to document: ${image.alt} (${imgSrc.substring(0, 50)}...)`);
                                    
                                    // Create an image node with centering attributes and editable property
                                    resultNodes.push(
                                        schema.nodes.image.create({
                                            src: imgSrc,
                                            alt: image.alt,
                                            title: image.alt,
                                            style: 'display: block; margin: 0 auto; max-width: 100%;',
                                            // Add data-editable attribute if the image is marked as editable
                                            'data-editable': image.editable ? 'true' : undefined
                                        })
                                    );
                                    
                                    // Add a paragraph after the image for spacing
                                    resultNodes.push(
                                        schema.nodes.paragraph.create({}, schema.text('\u200B'))  // Use zero-width space
                                    );
                                } catch (e) {
                                    console.warn('Error processing image:', e);
                                    // Fallback to just showing a text placeholder
                                    resultNodes.push(
                                        schema.nodes.paragraph.create({}, 
                                            schema.text(`[Image could not be processed: ${image.alt || 'File too large'}]`, [
                                                schema.marks.italic.create()
                                            ])
                                        )
                                    );
                                }
                            } else {
                                console.warn(`Image index ${imageIndex} not found in extracted images array`);
                                // Image not found, add a placeholder
                                resultNodes.push(
                                    schema.nodes.paragraph.create({}, 
                                        schema.text(`[Image placeholder ${imageIndex} not found]`, [
                                            schema.marks.italic.create()
                                        ])
                                    )
                                );
                            }
                            continue;
                        }
                    }
                    
                    // Code block handling (```code```)
                    if (trimmedLine.startsWith('```')) {
                        if (inCodeBlock) {
                            // End code block
                            inCodeBlock = false;
                            if (currentParagraphText) {
                                resultNodes.push(
                                    schema.nodes.codeBlock.create({}, schema.text(currentParagraphText))
                                );
                                currentParagraphText = '';
                            }
                            continue;
                        } else {
                            // Start code block
                            inCodeBlock = true;
                            // Push any accumulated paragraph text
                            if (currentParagraphText) {
                                resultNodes.push(
                                    schema.nodes.paragraph.create({}, schema.text(currentParagraphText))
                                );
                                currentParagraphText = '';
                            }
                            continue;
                        }
                    }
                    
                    // Inside code block
                    if (inCodeBlock) {
                        currentParagraphText += line + '\n';
                        continue;
                    }
                    
                    // Image reference handling (legacy format)
                    if (trimmedLine.startsWith('[Image:') && trimmedLine.includes(']')) {
                        // Push any accumulated paragraph text
                        if (currentParagraphText) {
                            resultNodes.push(
                                schema.nodes.paragraph.create({}, schema.text(currentParagraphText))
                            );
                            currentParagraphText = '';
                        }
                        
                        // Add a paragraph with the image reference
                        const imgRef = trimmedLine.substring(7, trimmedLine.indexOf(']')).trim();
                        resultNodes.push(
                            schema.nodes.paragraph.create({}, 
                                schema.text(`[Image Reference: ${imgRef}]`, [
                                    schema.marks.italic.create()
                                ])
                            )
                        );
                        continue;
                    }
                    
                    // Page marker
                    if (trimmedLine.startsWith('--- Page ') && trimmedLine.endsWith(' ---')) {
                        // Push any accumulated paragraph text
                        if (currentParagraphText) {
                            resultNodes.push(
                                schema.nodes.paragraph.create({}, schema.text(currentParagraphText))
                            );
                            currentParagraphText = '';
                        }
                        
                        // Add page separator
                        resultNodes.push(
                            schema.nodes.paragraph.create({}, 
                                schema.text(trimmedLine, [
                                    schema.marks.bold.create()
                                ])
                            )
                        );
                        continue;
                    }
                    
                    // H1 heading (# heading)
                    if (trimmedLine.startsWith('# ')) {
                        // Push any accumulated paragraph text
                        if (currentParagraphText) {
                            resultNodes.push(
                                schema.nodes.paragraph.create({}, schema.text(currentParagraphText))
                            );
                            currentParagraphText = '';
                        }
                        
                        // Create heading
                        const headingText = trimmedLine.substring(2);
                        resultNodes.push(
                            schema.nodes.heading.create({ level: 1 }, schema.text(headingText))
                        );
                        continue;
                    }
                    
                    // H2 heading (## heading)
                    if (trimmedLine.startsWith('## ')) {
                        // Push any accumulated paragraph text
                        if (currentParagraphText) {
                            resultNodes.push(
                                schema.nodes.paragraph.create({}, schema.text(currentParagraphText))
                            );
                            currentParagraphText = '';
                        }
                        
                        // Create heading
                        const headingText = trimmedLine.substring(3);
                        resultNodes.push(
                            schema.nodes.heading.create({ level: 2 }, schema.text(headingText))
                        );
                        continue;
                    }
                    
                    // H3 heading (### heading)
                    if (trimmedLine.startsWith('### ')) {
                        // Push any accumulated paragraph text
                        if (currentParagraphText) {
                            resultNodes.push(
                                schema.nodes.paragraph.create({}, schema.text(currentParagraphText))
                            );
                            currentParagraphText = '';
                        }
                        
                        // Create heading
                        const headingText = trimmedLine.substring(4);
                        resultNodes.push(
                            schema.nodes.heading.create({ level: 3 }, schema.text(headingText))
                        );
                        continue;
                    }
                    
                    // List item handling
                    if (trimmedLine.startsWith('• ') || trimmedLine.startsWith('- ')) {
                        const itemText = trimmedLine.substring(2);
                        
                        if (!inList) {
                            // Start a new list
                            inList = true;
                            
                            // Push any accumulated paragraph text
                            if (currentParagraphText) {
                                resultNodes.push(
                                    schema.nodes.paragraph.create({}, schema.text(currentParagraphText))
                                );
                                currentParagraphText = '';
                            }
                            
                            listItems = [itemText];
                        } else {
                            // Continue the list
                            listItems.push(itemText);
                        }
                        continue;
                    } else if (inList) {
                        // End of list
                        inList = false;
                        
                        // Create bullet list with items
                        const listItemNodes = listItems.map(text => 
                            schema.nodes.listItem.create({}, schema.nodes.paragraph.create({}, schema.text(text)))
                        );
                        
                        resultNodes.push(
                            schema.nodes.bulletList.create({}, listItemNodes)
                        );
                        
                        listItems = [];
                    }
                    
                    // Empty line starts a new paragraph
                    if (trimmedLine === '') {
                        if (currentParagraphText) {
                            resultNodes.push(
                                schema.nodes.paragraph.create({}, schema.text(currentParagraphText))
                            );
                            currentParagraphText = '';
                        }
                    } else {
                        // Regular content - if the previous line wasn't empty, append with space
                        currentParagraphText += (currentParagraphText && !currentParagraphText.endsWith('\n') ? ' ' : '') + line;
                    }
                }
                
                // Handle any remaining content
                if (inList && listItems.length > 0) {
                    // Create bullet list with remaining items
                    const listItemNodes = listItems.map(text => 
                        schema.nodes.listItem.create({}, schema.nodes.paragraph.create({}, schema.text(text)))
                    );
                    
                    resultNodes.push(
                        schema.nodes.bulletList.create({}, listItemNodes)
                    );
                } else if (inCodeBlock && currentParagraphText) {
                    // Create code block with remaining content
                    resultNodes.push(
                        schema.nodes.codeBlock.create({}, schema.text(currentParagraphText))
                    );
                } else if (currentParagraphText) {
                    // Create regular paragraph with remaining content
                    resultNodes.push(
                        schema.nodes.paragraph.create({}, schema.text(currentParagraphText))
                    );
                }
                
                // If we have no nodes, create a simple paragraph
                if (resultNodes.length === 0) {
                    resultNodes.push(
                        schema.nodes.paragraph.create({}, schema.text(`Parsed content from ${file.name}`))
                    );
                }
                
                // Create document fragment with all nodes
                const fragment = schema.nodes.doc.createChecked({}, resultNodes);
                
                try {
                    // Check if the view state is still valid before dispatching
                    if (view.isDestroyed) {
                        console.warn('Editor view was destroyed, cannot insert document content');
                        return;
                    }
                    
                    // Get a fresh transaction from the current state
                    const currentTr = view.state.tr;
                    
                    // Insert the parsed content with the fresh transaction
                    view.dispatch(
                        currentTr
                            .setMeta(actionKey, { type: "remove", id })
                            .replaceWith(from, to, fragment)
                            .setSelection(TextSelection.create(currentTr.doc, from + 2))
                    );
                    
                    if (options.uploaderEvent && typeof options.uploaderEvent.onUploadSuccess === 'function') {
                        options.uploaderEvent.onUploadSuccess(file, "content-extracted");
                    }
                } catch (error: any) { // Type the error as any to safely access message property
                    console.error('Error dispatching transaction:', error);
                    // If dispatch fails, try a simple fallback with just text
                    trySimpleFallback(editor, file, id, `Failed to insert content from ${file.name}: ${error?.message || 'Unknown error'}`);
                }
            }
        } else {
            // If extraction failed, fall back to upload
            if (extensionThis && typeof extensionThis.uploadFileToServer === 'function') {
                extensionThis.uploadFileToServer.call(extensionThis, file, id, headers);
            } else {
                console.error("Unable to fallback to file upload: uploadFileToServer is not available");
                // Use a helper function for fallback to avoid schema reference errors
                trySimpleFallback(editor, file, id, `[File: ${file.name} (${Math.round(file.size/1024)} KB)]`);
            }
        }
    } catch (error: any) { // Type the error as any
        console.error("Document parsing failed:", error);
        // Fall back to regular upload with a safety check
        if (extensionThis && typeof extensionThis.uploadFileToServer === 'function') {
            extensionThis.uploadFileToServer.call(extensionThis, file, id, headers);
        } else {
            console.error("Unable to fallback to file upload: uploadFileToServer is not available");
            // Use a helper function for fallback
            trySimpleFallback(editor, file, id, `[Error processing ${file.name}: ${error?.message || String(error)}]`);
        }
    }
    
    // Apply enhancement immediately after content insertion
    setTimeout(() => {
        try {
            if (editor && editor.view && editor.view.dom) {
                enhanceImageNode(editor.view.dom);
                console.log('Enhanced images after document parsing');
            }
        } catch (e) {
            console.error('Error enhancing images:', e);
        }
    }, 100);
    
    // And again after a longer delay to catch any late-rendered content
    setTimeout(() => {
        try {
            if (editor && editor.view && editor.view.dom) {
                enhanceImageNode(editor.view.dom);
            }
        } catch (e) {
            console.error('Error enhancing images (delayed):', e);
        }
    }, 1000);
};

// Helper function for simple fallback without schema reference issues
const trySimpleFallback = (editor: any, file: File, id: string, fallbackText: string): void => {
    try {
        const {view} = editor;
        if (!view || view.isDestroyed) return;
        
        // Get the editor schema from the view's state
        const editorSchema = view.state.schema;
        
        // Get a fresh transaction
        const currentTr = view.state.tr;
        
        // Get decoration set - fix the null arguments
        const decorationSet = actionKey.getState(view.state);
        if (!decorationSet) return;
        
        // Use 0 instead of null for from/to positions when finding decorations
        const found = decorationSet.find(0, view.state.doc.content.size, (spec: any) => spec.id == id);
        
        if (found && found.length) {
            const from = found[0].from;
            const to = found[0].to;
            
            // Use the editor schema instead of the global schema
            view.dispatch(
                currentTr
                    .setMeta(actionKey, { type: "remove", id })
                    .replaceWith(from, to, editorSchema.text(fallbackText))
            );
        }
    } catch (e) {
        console.error('Error in simple fallback:', e);
    }
};

// Helper function to determine if we should parse the document based on parseMode and file type
const determineShouldParse = (
    file: File,
    fileType: string,
    options: FileUploadOptions
): boolean => {
    // Check if extraction is enabled
    if (!options.extractContent) return false;
    
    // Check file size
    if (options.maxExtractSize && file.size > options.maxExtractSize) return false;
    
    // Check supported formats
    const supportedFormats = options.supportedFormats || ['pdf', 'txt', 'rtf', 'doc', 'docx', 'html', 'csv'];
    const isSupported = supportedFormats.includes(fileType);
    if (!isSupported) return false;
    
    // Check parse mode
    const parseMode = options.parseMode || 'auto';
    switch (parseMode) {
        case 'always':
            return true;
        case 'never':
            return false;
        case 'ask':
            // In an actual implementation, you could show a dialog here
            // For now, we'll assume the user said yes for parseable documents
            return true;
        case 'auto':
        default:
            // Auto mode: parse PDFs, text files, HTML, and CSV by default
            return ['pdf', 'text', 'html', 'csv'].includes(fileType);
    }
};

// Memory-efficient document processing
const processDocumentInChunks = async (
  result: ExtractResult,
  editor: Editor,
  progressCallback?: (progress: number) => void
): Promise<void> => {
  const { text, images } = result;
  
  // First, clear any existing content if needed
  editor.commands.clearContent();
  
  // If there's no content, don't process further
  if (!text && (!images || images.length === 0)) {
    return;
  }
  
  // Process text in chunks if it's large
  if (text) {
    const TEXT_CHUNK_SIZE = 10000; // Process 10K characters at a time
    
    if (text.length > TEXT_CHUNK_SIZE) {
      // For large documents, break into chunks
      const chunks = [];
      for (let i = 0; i < text.length; i += TEXT_CHUNK_SIZE) {
        chunks.push(text.substring(i, i + TEXT_CHUNK_SIZE));
      }
      
      // Process chunks with pauses to allow UI to remain responsive
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Process the text chunk
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            processTextChunk(chunk, editor, images);
            
            if (progressCallback) {
              progressCallback((i + 1) / chunks.length * 50); // First 50% for text
            }
            
            resolve();
          }, 0);
        });
      }
    } else {
      // Small document, process all at once
      processTextChunk(text, editor, images);
      
      if (progressCallback) {
        progressCallback(50); // Text complete
      }
    }
  }
  
  // Process images in batches to avoid memory spikes
  if (images && images.length > 0) {
    const IMAGE_BATCH_SIZE = 5; // Process 5 images at a time
    
    for (let i = 0; i < images.length; i += IMAGE_BATCH_SIZE) {
      const batch = images.slice(i, i + IMAGE_BATCH_SIZE);
      
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          processImageBatch(batch, editor);
          
          if (progressCallback) {
            const textProgress = 50; // Text was 50%
            const imageProgress = (i + batch.length) / images.length * 50; // Images are other 50%
            progressCallback(textProgress + imageProgress);
          }
          
          resolve();
        }, 0);
      });
    }
  }
};

// Helper function to process a text chunk
const processTextChunk = (chunk: string, editor: Editor, images: Array<{ src: string, alt: string }>) => {
  // Replace image placeholders with markers we can find later
  let processedText = chunk;
  
  // Replace image placeholders with unique markers
  for (let i = 0; i < images.length; i++) {
    const placeholder = `[IMAGE_PLACEHOLDER_${i}]`;
    const marker = `__IMG_MARKER_${i}__`;
    processedText = processedText.replace(new RegExp(placeholder, 'g'), marker);
  }
  
  // Insert the text at current position
  editor.commands.insertContent(processedText);
};

// Helper function to process a batch of images
const processImageBatch = (imageBatch: Array<{ src: string, alt: string }>, editor: Editor) => {
  // Find positions of image markers and insert images
  const doc = editor.state.doc;
  const tr = editor.state.tr;
  
  let docChanged = false;
  
  // Process each image in the batch
  imageBatch.forEach(({ src, alt }, batchIndex) => {
    const imageIndex = imageBatch[batchIndex] ? batchIndex : 0;
    const marker = `__IMG_MARKER_${imageIndex}__`;
    
    // Find marker positions
    let pos = 0;
    while (pos < doc.content.size) {
      const searchResult = findInDocument(doc, marker, pos);
      if (!searchResult) break;
      
      const { from, to } = searchResult;
      
      // Delete the marker
      tr.delete(from, to);
      
      // Insert the image node
      tr.insert(from, editor.schema.nodes.image.create({ src, alt }));
      
      docChanged = true;
      pos = from + 1; // Move past the inserted image
    }
  });
  
  if (docChanged) {
    editor.view.dispatch(tr);
  }
};

// Helper to find text in a document
const findInDocument = (doc: any, text: string, startPos: number = 0): { from: number, to: number } | null => {
  const docSize = doc.content.size;
  
  for (let pos = startPos; pos < docSize; pos++) {
    const result = findTextAt(doc, pos, text);
    if (result) return result;
  }
  
  return null;
};

// Helper to check for text at a specific position
const findTextAt = (doc: any, pos: number, text: string): { from: number, to: number } | null => {
  try {
    const resolvedPos = doc.resolve(pos);
    const node = resolvedPos.node();
    
    if (node && node.isText) {
      const textContent = node.text || '';
      const offsetInNode = resolvedPos.textOffset;
      
      const startIndex = textContent.indexOf(text, offsetInNode);
      if (startIndex >= 0) {
        const from = pos - offsetInNode + startIndex;
        const to = from + text.length;
        return { from, to };
      }
    }
  } catch (e) {
    // Ignore errors from invalid positions
  }
  
  return null;
};

// Create a simple progress indicator
const createProgressIndicator = (editor: Editor, message: string = 'Processing document...'): {
  update: (progress: number) => void,
  complete: () => void,
  error: (errorMessage: string) => void,
  remove: () => void
} => {
  // Create a container for the progress indicator
  const container = document.createElement('div');
  container.id = `progress-indicator-${Date.now()}`;
  container.style.position = 'fixed';
  container.style.top = '10px';
  container.style.right = '10px';
  container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  container.style.color = 'white';
  container.style.padding = '10px 15px';
  container.style.borderRadius = '5px';
  container.style.zIndex = '9999';
  container.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '8px';
  container.style.transition = 'opacity 0.3s ease';
  
  // Add message
  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  container.appendChild(messageElement);
  
  // Create progress bar container
  const progressBarContainer = document.createElement('div');
  progressBarContainer.style.width = '250px';
  progressBarContainer.style.height = '8px';
  progressBarContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  progressBarContainer.style.borderRadius = '4px';
  progressBarContainer.style.overflow = 'hidden';
  container.appendChild(progressBarContainer);
  
  // Create progress bar
  const progressBar = document.createElement('div');
  progressBar.style.height = '100%';
  progressBar.style.backgroundColor = '#4caf50'; // Green
  progressBar.style.width = '0%';
  progressBar.style.transition = 'width 0.3s ease';
  progressBarContainer.appendChild(progressBar);
  
  // Add to DOM
  document.body.appendChild(container);
  
  // Create a force remove function to ensure container is removed
  const forceRemove = () => {
    try {
      // Check if container still exists in DOM
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    } catch (e) {
      console.error('Error removing progress indicator:', e);
    }
  };
  
  // Return interface to update the progress
  return {
    update: (progress: number) => {
      try {
        progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
      } catch (e) {
        // Container might be removed already
        forceRemove();
      }
    },
    complete: () => {
      try {
        container.style.backgroundColor = 'rgba(76, 175, 80, 0.8)'; // Green success
        messageElement.textContent = 'Processing complete!';
        progressBar.style.width = '100%';
        
        // Remove after delay
        setTimeout(() => {
          try {
            container.style.opacity = '0';
            setTimeout(forceRemove, 300);
          } catch (e) {
            forceRemove();
          }
        }, 1500);
      } catch (e) {
        forceRemove();
      }
    },
    error: (errorMessage: string) => {
      try {
        container.style.backgroundColor = 'rgba(244, 67, 54, 0.8)'; // Red error
        messageElement.textContent = errorMessage || 'Error processing document';
        progressBar.style.backgroundColor = '#f44336';
        
        // Remove after delay
        setTimeout(() => {
          try {
            container.style.opacity = '0';
            setTimeout(forceRemove, 3000);
          } catch (e) {
            forceRemove();
          }
        }, 3000);
      } catch (e) {
        forceRemove();
      }
    },
    // Add a direct remove method
    remove: forceRemove
  };
};

// Function to make an image editable by adding a text overlay capability
const makeImageEditable = (imageNode: HTMLImageElement): HTMLElement => {
  // Create a container for the editable image
  const container = document.createElement('div');
  container.className = 'editable-image-container';
  container.style.position = 'relative';
  container.style.display = 'inline-block';
  container.style.maxWidth = '100%';
  
  // Clone the image
  const image = imageNode.cloneNode(true) as HTMLImageElement;
  
  // Create overlay for text annotations
  const overlay = document.createElement('div');
  overlay.className = 'editable-image-overlay';
  overlay.contentEditable = 'true';
  overlay.style.position = 'absolute';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'transparent';
  overlay.style.color = '#fff';
  overlay.style.textShadow = '0px 0px 3px #000, 0px 0px 5px #000'; // Stronger text shadow for better visibility
  overlay.style.fontFamily = 'Arial, sans-serif';
  overlay.style.zIndex = '2';
  overlay.style.overflow = 'hidden';
  overlay.style.boxSizing = 'border-box';
  overlay.style.padding = '10px';
  overlay.style.cursor = 'text';
  
  // Add placeholder text that disappears when editing starts
  overlay.dataset.placeholder = 'Click to add text annotations...';
  
  // Prevent overlay from interfering with image resizing
  overlay.addEventListener('mousedown', (e) => {
    // Don't prevent event if we're actually trying to edit text
    if ((e.target as HTMLElement).classList.contains('editable-image-overlay')) {
      e.stopPropagation();
    }
  });
  
  // Create toolbar for the editable image
  const toolbar = document.createElement('div');
  toolbar.className = 'editable-image-toolbar';
  toolbar.style.position = 'absolute';
  toolbar.style.top = '-40px';
  toolbar.style.left = '0';
  toolbar.style.width = '100%';
  toolbar.style.height = '36px';
  toolbar.style.background = 'rgba(0,0,0,0.7)';
  toolbar.style.color = '#fff';
  toolbar.style.display = 'flex';
  toolbar.style.alignItems = 'center';
  toolbar.style.justifyContent = 'space-around';
  toolbar.style.borderRadius = '4px 4px 0 0';
  toolbar.style.opacity = '0';
  toolbar.style.transition = 'opacity 0.2s ease-in-out';
  toolbar.style.zIndex = '3';
  toolbar.style.pointerEvents = 'none'; // Initially disabled
  
  // Add toolbar buttons
  const createToolbarButton = (icon: string, tooltip: string, action: () => void) => {
    const button = document.createElement('button');
    button.innerHTML = icon;
    button.title = tooltip;
    button.style.background = 'transparent';
    button.style.border = 'none';
    button.style.color = '#fff';
    button.style.cursor = 'pointer';
    button.style.padding = '5px 10px';
    button.style.fontSize = '14px';
    button.onclick = (e) => {
      e.preventDefault();
      action();
    };
    return button;
  };
  
  // Add text formatting buttons
  const boldButton = createToolbarButton('<b>B</b>', 'Bold', () => {
    document.execCommand('bold', false);
  });
  
  const italicButton = createToolbarButton('<i>I</i>', 'Italic', () => {
    document.execCommand('italic', false);
  });
  
  const colorButton = createToolbarButton('🎨', 'Change text color', () => {
    const color = prompt('Enter color (name or hex):', '#ffffff');
    if (color) {
      document.execCommand('foreColor', false, color);
    }
  });
  
  const resetButton = createToolbarButton('↺', 'Reset all annotations', () => {
    overlay.innerHTML = '';
  });
  
  // Add buttons to toolbar
  toolbar.appendChild(boldButton);
  toolbar.appendChild(italicButton);
  toolbar.appendChild(colorButton);
  toolbar.appendChild(resetButton);
  
  // Show toolbar when hovering over the editable area
  container.addEventListener('mouseenter', () => {
    toolbar.style.opacity = '1';
    toolbar.style.pointerEvents = 'auto';
  });
  
  container.addEventListener('mouseleave', () => {
    toolbar.style.opacity = '0';
    toolbar.style.pointerEvents = 'none';
  });
  
  // Add components to container
  container.appendChild(image);
  container.appendChild(overlay);
  container.appendChild(toolbar);
  
  // Add CSS rule for placeholder text if not already added
  if (!document.getElementById('editable-image-styles')) {
    const style = document.createElement('style');
    style.id = 'editable-image-styles';
    style.textContent = `
      .editable-image-overlay:empty:before {
        content: attr(data-placeholder);
        color: rgba(255,255,255,0.7);
        display: block;
      }
      .editable-image-container {
        margin: 1em auto;
        max-width: 100%;
      }
      .editable-image-overlay:focus {
        outline: 2px dashed rgba(0,0,255,0.5);
      }
    `;
    document.head.appendChild(style);
  }
  
  return container;
}

// New method for modifying the image node to add editing capabilities
const enhanceImageNode = (node: HTMLElement): void => {
  // Find all images within the node - include both enhanced and not enhanced for a more aggressive approach
  const images = node.querySelectorAll('img');
  
  // Apply editable enhancements to each image
  images.forEach(img => {
    // Check if image is already enhanced
    if (img.getAttribute('data-enhanced') === 'true') {
      return; // Skip already enhanced images
    }
    
    // Force all images to be editable in PDFs
    const parent = img.parentNode as HTMLElement;
    if (parent && !(parent.classList && parent.classList.contains('editable-image-container'))) {
      // Replace the image with our editable version
      const editableImage = makeImageEditable(img as HTMLImageElement);
      parent.replaceChild(editableImage, img);
      
      // Mark as enhanced to prevent multiple processing
      const imageInEditableContainer = editableImage.querySelector('img');
      if (imageInEditableContainer) {
        imageInEditableContainer.setAttribute('data-enhanced', 'true');
      }
      
      console.log('Enhanced image for editing:', img.getAttribute('alt') || 'image');
    }
  });
}

// Add a more aggressive approach to enhancement by also applying after the document is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const editorDom = document.querySelector('.ProseMirror');
    if (editorDom) {
      enhanceImageNode(editorDom as HTMLElement);
      console.log('Enhanced images after document load');
    }
  }, 1000); // Give time for the editor to render
});

// Create an enhanced version of parseAndInsertDocument
const enhancedParseAndInsertDocument = async (
    editor: any,
    file: File, 
    id: string, 
    headers: Record<string, any>,
    options: FileUploadOptions,
    extensionThis: any
) => {
    // Call the original function
    await parseAndInsertDocument(editor, file, id, headers, options, extensionThis);
    
    // Apply enhancement immediately after content insertion
    setTimeout(() => {
        enhanceImageNode(editor.view.dom);
        console.log('Enhanced images after document parsing');
    }, 100);
    
    // And again after a longer delay to catch any late-rendered content
    setTimeout(() => {
        enhanceImageNode(editor.view.dom);
    }, 1000);
};

// Keep a reference to the original function
const originalParseAndInsertDocument = parseAndInsertDocument;

// Instead, create a wrapper function
const enhancedPdfProcessing = (editor: any, file: File, id: string, headers: Record<string, any>, options: FileUploadOptions, extensionThis: any) => {
  // Call the original parseAndInsertDocument
  const result = parseAndInsertDocument(editor, file, id, headers, options, extensionThis);
  
  // Apply enhancement after document insertion
  if (result instanceof Promise) {
    result.then(() => {
      console.log('PDF document inserted, enhancing images');
      
      // Apply enhancements at different intervals to catch all images
      setTimeout(() => {
        if (editor && editor.view && editor.view.dom) {
          enhanceImageNode(editor.view.dom);
        }
      }, 100);
      
      setTimeout(() => {
        if (editor && editor.view && editor.view.dom) {
          enhanceImageNode(editor.view.dom);
        }
      }, 500);
      
      setTimeout(() => {
        if (editor && editor.view && editor.view.dom) {
          enhanceImageNode(editor.view.dom);
        }
      }, 1500);
    });
  }
  
  return result;
};

// Fix the schema reference in line 976
const createErrorNode = (editor: any, content: string) => {
  return editor.schema.text(content);
};

export const FileUploadExt = Extension.create<FileUploadOptions>({
    name: "fileUpload",

    addOptions() {
        return {
            uploadUrl: undefined,
            uploadHeaders: undefined,
            uploader: undefined,
            uploaderEvent: undefined,
            uploadFormName: undefined,
            // Defaults for document parsing options
            extractContent: true,
            maxExtractSize: 10 * 1024 * 1024, // 10MB default
            supportedFormats: ['pdf', 'txt', 'rtf', 'doc', 'docx', 'html', 'csv'],
            parseMode: 'auto', // Auto by default
            // Default advanced formatting options
            preserveFormatting: true,
            includeImageReferences: true,
            preserveDocumentStructure: true,
            maxExtractedContentSize: 100000, // 100k characters
            // PDF.js configuration
            pdfWorkerSrc: undefined, // Custom path to the PDF.js worker file
            offlineWorkerPath: '/pdf.worker.min.mjs', // Path to local worker file for offline use
            preferOffline: false, // Whether to prefer offline mode even when online
            maxImageSize: 500, // Maximum image size for optimization (in KB)
            uploadFn: undefined, // Custom upload function
            handleImageFiles: true, // Whether to handle image files (default true)
            handleOtherFiles: true, // Whether to handle other files (default true)
            maxFileSize: 10 * 1024 * 1024, // Maximum file size for uploads (default 10MB)
        };
    },

    onCreate() {
        // Configure PDF.js worker based on options with offline support
        if (typeof window !== 'undefined') {
            try {
                const pdfjsVersion = pdfjsLib.version;
                
                // Always use the local worker file to avoid CDN issues
                const workerPath = this.options.pdfWorkerSrc || '/pdf.worker.min.mjs';
                pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
                console.log('Using PDF.js worker path:', workerPath);

                // Apply enhancement to all images after DOM is loaded
                const addImageEnhancementToDocument = () => {
                    setTimeout(() => {
                        const editorDom = document.querySelector('.ProseMirror');
                        if (editorDom) {
                            enhanceImageNode(editorDom as HTMLElement);
                            console.log('Enhanced images after document load (from onCreate)');
                        }
                    }, 1500);
                };

                // Listen for custom PDF document inserted event
                document.addEventListener('pdf-document-inserted', () => {
                    console.log('PDF document inserted event received');
                    // Run enhancement multiple times to catch all images
                    setTimeout(() => {
                        const editorDom = document.querySelector('.ProseMirror');
                        if (editorDom) enhanceImageNode(editorDom as HTMLElement);
                    }, 100);
                    
                    setTimeout(() => {
                        const editorDom = document.querySelector('.ProseMirror');
                        if (editorDom) enhanceImageNode(editorDom as HTMLElement);
                    }, 500);
                    
                    setTimeout(() => {
                        const editorDom = document.querySelector('.ProseMirror');
                        if (editorDom) enhanceImageNode(editorDom as HTMLElement);
                    }, 1500);
                });

                // Set up the enhancement to run after loading
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', addImageEnhancementToDocument);
                } else {
                    addImageEnhancementToDocument();
                }
                
            } catch (e) {
                console.error('Failed to configure PDF.js worker:', e);
            }
        }
    },

    addCommands() {
        return {
            uploadFile: (file: File) => ({ editor }) => {
                // Create a unique ID for this upload
                const id = `upload-${Date.now()}`;
                
                // Insert a placeholder for the file
                let text = file.name;
                if (file.type.includes("image")) {
                    text = `Uploading ${file.name}…`;
                }
                
                // Insert placeholder
                const { tr } = editor.state;
                editor.view.dispatch(
                  tr.setMeta(actionKey, {
                    type: "add",
                    id,
                    pos: tr.selection.from,
                    text,
                  })
                );
                
                // Handle based on file type
                if (file.type.includes("image")) {
                    // Use the proper reference to this extension's method
                    (this as any).processImageUpload(file, id, editor.view);
                } else if (file.type === "application/pdf") {
                    // Process PDF file using our wrapper
                    const headers = (typeof this.options.uploadHeaders === "object") ? this.options.uploadHeaders :
                        ((typeof this.options.uploadHeaders === "function") ? this.options.uploadHeaders() : {});
                    
                    enhancedPdfProcessing(editor, file, id, headers, this.options, this)
                      .catch(error => {
                        console.error('Error parsing PDF:', error);
                      });
                } else {
                    // Use the proper reference to this extension's method
                    (this as any).uploadFileToServer(file, id, {});
                }
                
                return true;
            },
            // ...other commands...
        };
    },

    // Helper method to handle uploading the file to server
    uploadFileToServer(file: File, id: string, headers: Record<string, any>) {
        const {view} = this.editor!;
        const editorSchema = this.editor!.schema;
        const { tr } = view.state;
        const uploader = this.options.uploader || getUploader(this.options.uploadUrl!);
        const uploadFormName = this.options.uploadFormName || "file";

        uploader(file, uploadFormName, this.options.uploadUrl!, headers)
            .then((response: any) => {
                // Extract URL from response
                let url = '';
                try {
                    if (typeof response === 'string') {
                        url = response;
                    } else if (response && typeof response === 'object') {
                        url = response.url || response.data?.url || '';
                    }

                    if (!url) {
                        throw new Error('No URL in upload response');
                    }

                    // Find the decoration and replace it with the link node
                    const decorationSet = actionKey.getState(view.state);
                    const found = decorationSet?.find(null, null, (spec: any) => spec.id === id);

                    if (found && found.length) {
                        const from = found[0].from;
                        const to = found[0].to;

                        view.dispatch(
                            view.state.tr
                                .setMeta(actionKey, { type: "remove", id })
                                .replaceWith(from, to, editorSchema.text(url))
                        );
                    }

                    if (this.options.uploaderEvent?.onUploadSuccess) {
                        this.options.uploaderEvent.onUploadSuccess(file, url);
                    }
                } catch (error) {
                    console.error('Error processing upload response:', error);
                    if (this.options.uploaderEvent?.onUploadError) {
                        this.options.uploaderEvent.onUploadError(file, error);
                    }
                }
            })
            .catch((error: any) => {
                // Show error and remove loading placeholder
                console.error("File upload failed:", error);
                const { tr } = view.state;
                const decorationSet = actionKey.getState(view.state);
                const found = decorationSet?.find(null, null, (spec: any) => spec.id === id);

                if (found && found.length) {
                    view.dispatch(
                        tr.setMeta(actionKey, { type: "remove", id })
                    );
                }

                if (this.options.uploaderEvent?.onUploadError) {
                    this.options.uploaderEvent.onUploadError(file, error);
                }
            });
    },

    addProseMirrorPlugins() {
        const editor = this.editor;
        
        return [
            new Plugin({
                key: actionKey,
                state: {
                    init: () => DecorationSet.empty,
                    apply: (tr, old) => {
                        let meta = tr.getMeta(actionKey);
                        if (!meta) return old;

                        if (meta.type === "add") {
                            // Use createAttachmentDecoration if text is provided
                            const decoration = meta.text 
                                ? createAttachmentDecoration({
                                    id: meta.id,
                                    pos: meta.pos,
                                    text: meta.text
                                  })
                                : createMediaDecoration({
                                    id: meta.id,
                                    pos: meta.pos
                                  });
                            return old.add(tr.doc, [decoration]);
                        }
                        
                        if (meta.type === "update") {
                            // Find and update decoration text
                            // Use 0 instead of null for position params
                            const found = old.find(0, tr.doc.content.size, (spec: any) => spec.id == meta.id);
                            if (found && found.length) {
                                const oldDecoration = found[0];
                                // Use createAttachmentDecoration for updates since they always include text
                                const newDecoration = createAttachmentDecoration({
                                    id: meta.id,
                                    pos: oldDecoration.from,
                                    text: meta.text
                                });
                                
                                return old.remove([oldDecoration]).add(tr.doc, [newDecoration]);
                            }
                        }

                        if (meta.type === "remove") {
                            // Try to use the DecorationSet method
                            // Use 0 instead of null for position params
                            const found = old.find(0, tr.doc.content.size, (spec: any) => spec.id === meta.id);
                            if (found && found.length) {
                                return old.remove(found);
                            }
                            return old;
                        }
                        return old;
                    }
                },
                props: {
                    decorations: state => {
                        return actionKey.getState(state);
                    },
                    handleDOMEvents: {
                        paste(view, event) {
                            const hasFiles = event.clipboardData && event.clipboardData.files && event.clipboardData.files.length;
                            
                            if (!hasFiles) return false;
                            
                            const files = Array.from(event.clipboardData.files);
                            
                            if (files.length === 0) return false;
                            
                            event.preventDefault();
                            
                            files.forEach(file => {
                                editor.commands.uploadFile(file);
                            });
                            
                            return true;
                        }
                    }
                },
                // Add a view plugin to handle DOM mutations
                view: (view) => {
                    // Create a mutation observer to watch for changes in the DOM
                    const observer = new MutationObserver((mutations) => {
                        let needsEnhancement = false;
                        
                        // Check if any mutations added images
                        mutations.forEach(mutation => {
                            if (mutation.type === 'childList') {
                                mutation.addedNodes.forEach(node => {
                                    if (node.nodeType === Node.ELEMENT_NODE) {
                                        const el = node as HTMLElement;
                                        if (el.tagName === 'IMG' || el.querySelector('img')) {
                                            needsEnhancement = true;
                                        }
                                    }
                                });
                            }
                        });
                        
                        // Apply enhancements if needed
                        if (needsEnhancement) {
                            enhanceImageNode(view.dom);
                        }
                    });
                    
                    // Start observing the document
                    observer.observe(view.dom, {
                        childList: true,
                        subtree: true
                    });
                    
                    return {
                        destroy() {
                            observer.disconnect();
                        },
                        // Add this update method to handle transactions
                        update: (view, prevState) => {
                            // Check if any content has changed
                            if (view.state.doc !== prevState.doc) {
                                setTimeout(() => {
                                    enhanceImageNode(view.dom);
                                }, 0);
                                
                                setTimeout(() => {
                                    enhanceImageNode(view.dom);
                                }, 500);
                            }
                            return true;
                        }
                    };
                }
            })
        ];
    },

    handleDrop(view: any, event: DragEvent, slice: any, moved: boolean) {
        if (!event.dataTransfer?.files?.length) return false;
        
        const files = Array.from(event.dataTransfer.files);
        
        // Handle each file using the uploadFile command
        files.forEach(file => {
            this.editor.commands.uploadFile(file);
        });

        return true;
    },

    // Method to handle image uploads with optimizations
    uploadImageFile(file: File) {
        return new Promise(async (resolve, reject) => {
            // Validate the file is an image
            if (!file.type.startsWith('image/')) {
                reject(new Error('Not an image file'));
                return;
            }
            
            try {
                // Read the image file
                const reader = new FileReader();
                
                reader.onload = async (event) => {
                    try {
                        if (!event.target?.result) {
                            reject(new Error('Failed to read image file'));
                            return;
                        }
                        
                        const dataUrl = event.target.result.toString();
                        
                        // Optimize the image - resize if too large
                        let optimizedImage = dataUrl;
                        
                        // Only resize if the file is over 500KB or has dimensions over 2000px
                        if (file.size > 500 * 1024) {
                            optimizedImage = await resizeImageIfNeeded(dataUrl, this.options.maxImageSize || 500);
                        }
                        
                        // Get image dimensions for logging
                        const img = new Image();
                        const dimensions = new Promise<{width: number, height: number}>((resolveDimensions) => {
                            img.onload = () => {
                                const { width, height } = img;
                                resolveDimensions({ width, height });
                                
                                // Clean up image object
                                img.src = '';
                            };
                            img.onerror = () => resolveDimensions({ width: 0, height: 0 });
                            img.src = optimizedImage;
                        });
                        
                        const { width, height } = await dimensions;
                        
                        // Log optimization results
                        if (dataUrl !== optimizedImage) {
                            const originalSize = Math.round(dataUrl.length / 1024);
                            const optimizedSize = Math.round(optimizedImage.length / 1024);
                            const reduction = Math.round((1 - optimizedSize / originalSize) * 100);
                            
                            console.log(
                                `Optimized image: ${width}x${height}px, ` +
                                `${originalSize}KB → ${optimizedSize}KB (${reduction}% reduction)`
                            );
                        }
                        
                        // If a custom upload function is provided, use it
                        if (this.options.uploadFn) {
                            try {
                                const url = await this.options.uploadFn(optimizedImage);
                                resolve(url);
                            } catch (uploadError) {
                                reject(uploadError);
                            }
                            return;
                        }
                        
                        // Otherwise just use the data URL
                        resolve(optimizedImage);
                    } catch (error) {
                        reject(error);
                    }
                };
                
                reader.onerror = () => reject(new Error('Error reading image file'));
                reader.readAsDataURL(file);
            } catch (error) {
                reject(error);
            }
        });
    },
    
    // Method to handle uploading other file types
    uploadOtherFile(file: File) {
      return new Promise(async (resolve, reject) => {
        try {
          // If we have a custom upload function, use it
          if (this.options.uploadFn) {
            try {
              const url = await this.options.uploadFn(file);
              resolve(url);
              return;
            } catch (uploadError) {
              reject(uploadError);
              return;
            }
          }
          
          // Otherwise use the standard uploader
          const uploader = this.options.uploader || getUploader(this.options.uploadUrl!);
          const uploadFormName = this.options.uploadFormName || "file";
          const headers = (typeof this.options.uploadHeaders === "object") ? this.options.uploadHeaders :
                          ((typeof this.options.uploadHeaders === "function") ? this.options.uploadHeaders() : {});
          
          const result = await uploader(file, uploadFormName, this.options.uploadUrl!, headers);
          
          // Process result
          let url = '';
          if (typeof result === 'string') {
            url = result;
          } else if (typeof result === 'object' && result !== null) {
            if (result.url) {
              url = result.url;
            } else if (result.data && result.data.url) {
              url = result.data.url;
            }
          }
          
          resolve(url);
        } catch (error) {
          reject(error);
        }
      });
    },

    // New method to process image uploads
    processImageUpload(file: File, id: string, view: any) {
        // Get the schema from the view state
        const editorSchema = this.editor!.schema;
        
        // Add spinner styles to document
        addSpinnerStyles();
        
        // Show processing message with spinner
        const decorationSet = actionKey.getState(view.state);
        const found = decorationSet?.find(null, null, (spec: any) => spec.id == id);
        let progressIndicator = null;
        
        if (found && found.length) {
            const processingMessage = `
                <div class="image-loading-container">
                    ${loadingSpinnerSVG}
                    <span style="margin-left: 8px;">Processing ${file.name}...</span>
                </div>
            `;
            
            view.dispatch(
                view.state.tr.setMeta(actionKey, { 
                    type: "update", 
                    id,
                    text: processingMessage
                })
            );
            
            // Create a progress indicator for larger files
            if (file.size > 500 * 1024) { // For files > 500KB
                progressIndicator = createProgressIndicator(
                    this.editor, 
                    `Processing image: ${file.name}...`
                );
                progressIndicator.update(10); // Initial progress
            }
        }
        
        // Process the image file
        this.uploadImageFile(file)
            .then((imageUrl: string) => {
                try {
                    if (!imageUrl) {
                        throw new Error('No URL returned from image processing');
                    }
                    
                    // Update progress if indicator exists
                    if (progressIndicator) {
                        progressIndicator.update(80);
                    }
                    
                    // Find the decoration
                    const decorationSet = actionKey.getState(view.state);
                    const found = decorationSet?.find(null, null, (spec: any) => spec.id == id);
                    
                    if (found && found.length) {
                        const from = found[0].from;
                        const to = found[0].to;
                        
                        // Create an image node with the URL and editable attributes
                        const imageNode = editorSchema.nodes.image.create({
                            src: imageUrl,
                            alt: file.name,
                            title: file.name,
                            "data-editable": "true"
                        });
                        
                        view.dispatch(
                            view.state.tr
                                .setMeta(actionKey, { type: "remove", id })
                                .replaceWith(from, to, imageNode)
                        );
                        
                        // Enhance the image after it's inserted
                        setTimeout(() => {
                            enhanceImageNode(view.dom);
                        }, 50);
                        
                        // Notify listeners
                        if (this.options.uploaderEvent?.onUploadSuccess) {
                            this.options.uploaderEvent.onUploadSuccess(file, imageUrl);
                        }
                        
                        // Complete progress indicator if it exists
                        if (progressIndicator) {
                            progressIndicator.complete();
                        }
                    } else {
                        // If decoration not found, clean up the progress indicator
                        if (progressIndicator) {
                            progressIndicator.remove();
                        }
                    }
                } catch (error) {
                    console.error('Error finalizing image upload:', error);
                    if (progressIndicator) {
                        progressIndicator.error('Error finalizing image upload');
                    }
                }
            })
            .catch((error: Error) => {
                console.error('Image processing failed:', error);
                
                // Show error in progress indicator
                if (progressIndicator) {
                    progressIndicator.error(`Error: ${error.message || 'Failed to process image'}`);
                }
                
                // Show error and remove loading placeholder
                const decorationSet = actionKey.getState(view.state);
                const found = decorationSet?.find(null, null, (spec: any) => spec.id == id);
                
                if (found && found.length) {
                    const from = found[0].from;
                    const to = found[0].to;
                    
                    // Replace with error message
                    view.dispatch(
                        view.state.tr
                            .setMeta(actionKey, { type: "remove", id })
                            .replaceWith(from, to, editorSchema.text(`Error processing image: ${error.message || 'Unknown error'}`))
                    );
                }
                
                if (this.options.uploaderEvent?.onUploadError) {
                    this.options.uploaderEvent.onUploadError(file, error);
                }
            });
    }
}); 
