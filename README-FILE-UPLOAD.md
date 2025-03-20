# Enhanced File Upload Feature for AiEditor

This feature enhances the AiEditor with the ability to extract and display content from common file formats directly in the editor, rather than just showing links to the files.

## Supported File Formats

- PDF (.pdf) - with text and image extraction
- Plain text (.txt)
- Rich Text Format (.rtf)
- Microsoft Word (.doc, .docx) - with text and image extraction
- HTML (.html, .htm) - with text and image extraction
- XML (.xml)

## Installation

1. Install the required dependencies:

```bash
npm install pdfjs-dist
```

For advanced document parsing capabilities (optional):

```bash
npm install mammoth # For DOCX parsing
npm install rtf-parser # For RTF parsing
```

## Usage

The file upload feature is ready to use with the default configuration. Users can:

1. Click the file upload button in the toolbar
2. Drag and drop files into the editor
3. Paste files from the clipboard

When a file is uploaded:
- For supported formats under the size limit (default 10MB), the content will be extracted and displayed in the editor
- For PDFs, Word documents, and HTML files, both text and images will be extracted and displayed
- Images are automatically centered in the editor for better readability
- For unsupported formats or files exceeding the size limit, a link to the file will be shown

## Configuration Options

You can customize the file upload behavior in your AiEditor configuration:

```javascript
new AiEditor({
    // ... other options
    fileUpload: {
        extractContent: true, // Enable/disable content extraction (default: true)
        maxExtractSize: 10 * 1024 * 1024, // Maximum file size for extraction in bytes (default: 10MB)
        supportedFormats: ['pdf', 'txt', 'rtf', 'doc', 'docx', 'html', 'htm'], // File formats to extract
        uploadUrl: '/api/upload', // Server upload URL (if you want to upload files to server)
        uploadHeaders: { 'Authorization': 'Bearer token' }, // Custom headers for server upload,
        includeImageReferences: true, // Whether to extract and display images (default: true)
    }
});
```

## Advanced Usage

### Using with Server-side Processing

For better document parsing, especially for large files, you can use server-side processing:

1. Configure your server to accept file uploads and extract their content
2. Set `extractContent: false` in the client configuration
3. Have your server return the extracted content in the response
4. Process the response to display the content in the editor

### Customizing Content Display

You can modify the `FileUploadExt.ts` file to customize how content is displayed in the editor:

- Change the heading level for the file name
- Adjust formatting of extracted content
- Add custom styling or metadata for different file types
- Customize image display options (size, alignment, etc.)

## Image Extraction

The extension now supports extracting and displaying images from:

- PDF documents
- Word documents
- HTML files

Images are automatically:
1. Extracted during document parsing
2. Converted to a suitable format for the editor
3. Inserted into the content at the appropriate positions
4. Centered in the editor for better readability

### PDF Image Extraction

For PDFs, the extension uses PDF.js to:
- Detect images in each page
- Extract them as PNG images
- Insert them into the editor with proper centering

### Word Document Image Extraction

For Word documents, the extension uses mammoth.js to:
- Extract embedded images from the document
- Convert them to data URLs
- Insert them into the editor with proper centering

### HTML Image Extraction

For HTML files, the extension:
- Extracts images from img tags
- Preserves their src attributes
- Inserts them into the editor with proper centering

## Troubleshooting

- **File upload fails**: Check browser console for errors. Ensure upload URL is correct and accessible.
- **Content extraction shows blank text**: Some PDFs and documents may be scanned images that require OCR to extract text.
- **Large files cause performance issues**: Increase `maxExtractSize` with caution. Consider server-side processing for large files.
- **Images not displaying**: Ensure PDF.js worker is properly configured. Check browser console for errors.
- **Image extraction slow**: For large documents with many images, extraction might take time. Consider increasing timeout values.

# File Upload Extension for AiEditor

This extension adds file upload capabilities to AiEditor, including support for:
- Image uploads 
- Document uploads (PDF, Word, RTF, TXT, HTML)
- Document content extraction and parsing
- Image extraction and rendering

## Basic Usage

```typescript
import { AiEditor, FileUploadExt } from 'aieditor';

const editor = new AiEditor({
  element: document.querySelector('#editor'),
  extensions: [
    FileUploadExt.configure({
      uploadUrl: '/api/upload',
      // Other options...
    }),
  ],
});
```

## Configuration Options

### Basic Upload Options

```typescript
FileUploadExt.configure({
  // URL to upload files to
  uploadUrl: '/api/upload',
  
  // Headers to include with upload request (object or function)
  uploadHeaders: { Authorization: 'Bearer token' },
  // OR as a function
  uploadHeaders: () => ({ Authorization: `Bearer ${getToken()}` }),
  
  // Custom uploader function
  uploader: (file, formName, url, headers) => {
    // Custom upload logic
    return Promise.resolve('https://example.com/uploads/file.jpg');
  },
  
  // Form field name for file upload (default: 'file')
  uploadFormName: 'attachment',
  
  // Event hooks
  uploaderEvent: {
    onUploadBefore: (file, url, headers) => {
      // Return false to cancel upload
      return true;
    },
    onUploadAfter: (file, url) => {
      console.log('File uploaded:', url);
    },
    onUploadError: (file, error) => {
      console.error('Upload error:', error);
    },
  },
});
```

### Document Parsing Options

```typescript
FileUploadExt.configure({
  // Enable/disable document content extraction (default: true)
  extractContent: true,
  
  // Maximum file size for extraction in bytes (default: 10MB)
  maxExtractSize: 5 * 1024 * 1024, // 5MB
  
  // Supported formats for content extraction
  supportedFormats: ['pdf', 'txt', 'doc', 'docx', 'html'],
  
  // How to handle parseable documents:
  // 'auto' - parse PDFs, text files, HTML by default
  // 'always' - always try to parse supported documents
  // 'never' - never parse, always upload as file
  // 'ask' - ask user (not implemented, falls back to 'always')
  parseMode: 'auto',
  
  // Advanced formatting options
  preserveFormatting: true, // Preserve document formatting
  includeImageReferences: true, // Include and extract images
  preserveDocumentStructure: true, // Preserve document structure
  maxExtractedContentSize: 50000, // Max content size in characters
  
  // PDF.js worker configuration - IMPORTANT for PDF extraction
  pdfWorkerSrc: '/pdf.worker.min.js',
});
```

## Setting Up PDF Extraction

For PDF extraction to work, you need to make the PDF.js worker file available. Here are your options, with the automatic offline-aware approach being the most reliable:

### Method 1 (Recommended): Offline-aware CDN approach with local fallback

The extension now includes automatic offline detection and fallback:

```typescript
FileUploadExt.configure({
  // No configuration needed for basic offline support!
  // The extension will automatically use:
  // - CDN when online
  // - Local file when offline (must be available at /pdf.worker.min.mjs)
})
```

For this to work:

1. Copy the worker file to your public directory:
```bash
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/
```

2. Make sure your server serves this file when requested

You can customize the offline behavior:

```typescript
FileUploadExt.configure({
  // Custom path to the offline worker file
  offlineWorkerPath: '/assets/js/pdf.worker.min.mjs',
  
  // Force offline mode even when online
  preferOffline: true, 
})
```

### Method 2: Use a specific CDN or version

If you need to use a specific CDN or version:

```typescript
FileUploadExt.configure({
  pdfWorkerSrc: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.mjs',
})
```

### Method 3: Copy the worker file to your public directory

If you want to always use the local file:

```typescript
FileUploadExt.configure({
  // Always use local file
  pdfWorkerSrc: '/pdf.worker.min.mjs',
  // Or force offline mode:
  preferOffline: true
})
```

### Method 4: Dynamic import (advanced)

For advanced users who want to bundle the worker:

```typescript
// In your application code
import * as pdfjsLib from 'pdfjs-dist';
import PDFJSWorker from 'pdfjs-dist/build/pdf.worker.entry';

pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(PDFJSWorker);
```

## Offline Support

The extension now includes automatic offline detection and fallback:

1. When online, it uses the CDN for the PDF.js worker
2. When offline, it automatically switches to the local worker file
3. When the connection is restored, it can switch back to the CDN

This allows your application to:
- Work seamlessly in offline or unreliable network conditions
- Benefit from CDN performance when online
- Provide a consistent user experience regardless of network status

To enable offline support:

1. Copy the PDF.js worker file to your public directory:
```bash
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/
```

2. Make sure your web server can serve this file when requested

3. That's it! The extension will automatically detect network status and use the appropriate worker file.

## Image Extraction and Display

The extension now extracts and displays images from documents:

1. **Automatic Image Extraction**: Images are extracted from PDFs, Word documents, and HTML files
2. **Centered Display**: All extracted images are centered in the editor for better readability
3. **Proper Spacing**: Images are surrounded by appropriate spacing for better presentation
4. **Alt Text Support**: Images include proper alt text based on the source document
5. **Formatting Preservation**: Images are displayed in the context of the document's structure

To customize image display:

```typescript
FileUploadExt.configure({
  // Enable/disable image extraction
  includeImageReferences: true,
  
  // Additional image options can be modified in the source code:
  // - Image quality (scale factor for PDFs)
  // - CSS styling for centering and size
  // - Alt text format
})
```

## Troubleshooting

### PDF Extraction Not Working

If you see errors like:

```
Setting up fake worker failed: "Failed to fetch dynamically imported module"
```

This usually means the PDF.js worker couldn't be loaded. Solutions:

1. **Check if you're offline**: If you're offline, make sure the local worker file is available
2. **Check the file path**: Ensure the worker file is available at the path specified in `offlineWorkerPath`
3. **Version mismatch**: Make sure the worker version matches your pdfjs-dist package version
4. **CORS issues**: If hosting the worker yourself, ensure proper CORS headers are set
5. **Force offline mode**: Set `preferOffline: true` to always use the local worker file

You can check the browser console for the exact worker URL being used and verify it's accessible.

### RTF Parsing Not Working

RTF parsing requires CommonJS environment and may not work in all browser contexts. 
The extension will automatically fall back to uploading RTF files as links. 

### Image Extraction Issues

If images aren't being extracted properly:

1. **Check browser console**: Look for any errors related to canvas or image handling
2. **Memory limitations**: Very large documents with many images might hit browser memory limits
3. **Same-origin policy**: Images from external sources might be blocked due to CORS restrictions
4. **PDF format**: Some PDF files use custom or non-standard image formats that may not extract correctly