# Document Parser for AiEditor

The Document Parser feature allows AiEditor to extract and display content from various document formats directly in the editor. When users upload supported document types, the content is extracted and inserted into the editor as formatted text, making it easy to edit and work with external documents.

## Supported Document Types

- **PDF** (.pdf) - Extracts text content page by page
- **Word Documents** (.doc, .docx) - Basic text extraction 
- **Text Files** (.txt) - Plain text insertion
- **HTML Files** (.html, .htm) - Clean HTML parsing
- **CSV Files** (.csv) - Formats data as a table
- **Excel Spreadsheets** (.xlsx, .xls) - Basic extraction
- **RTF Files** (.rtf) - Basic text extraction

## Configuration Options

You can configure the document parser behavior through the `fileUpload` options in your AiEditor configuration:

```javascript
const editor = new AiEditor({
    element: "#editor",
    // ... other configuration options
    fileUpload: {
        // Enable/disable content extraction from files (default: true)
        extractContent: true,
        
        // Maximum file size for content extraction in bytes (default: 10MB)
        maxExtractSize: 10 * 1024 * 1024,
        
        // Supported file formats for extraction
        supportedFormats: ['pdf', 'txt', 'rtf', 'doc', 'docx', 'html', 'csv', 'xlsx', 'xls'],
        
        // How to handle parseable documents:
        // - 'auto': Automatically parse supported formats (default)
        // - 'always': Always try to parse all supported documents
        // - 'never': Never parse, always upload as links
        // - 'ask': (Future implementation: Ask user whether to parse)
        parseMode: 'auto',
        
        // ... other file upload options
    }
});
```

## How It Works

When a user uploads a file through the File/Doc button:

1. The system checks if the file format is supported for parsing
2. For supported formats under the size limit, content is extracted 
3. The extracted content is inserted into the editor with proper formatting:
   - File name as a heading
   - Document content as formatted paragraphs
   - For PDFs, page numbers are added for multi-page documents
   - For tables (CSV), content is formatted in a tabular structure

If content extraction fails or the file is not supported for parsing, the system falls back to the regular file upload behavior, which inserts a link to the file.

## Implementation Details

The document parser uses:
- PDF.js for PDF extraction
- Browser's built-in DOM parser for HTML files
- String manipulation for CSV files
- Simple text extraction for other formats

For complete Word document parsing (DOCX), you may need additional libraries like `mammoth.js` for better results.

## Customizing the UI

The File/Doc button in the toolbar shows a tooltip with supported document types on hover. You can modify this by editing the `FileUpload.ts` component.

## Limitations

- PDF extraction quality depends on the PDF structure and content
- Word document (.docx) parsing is basic without additional libraries
- Excel files may not preserve complex formatting
- Images within documents are not extracted
- Large documents may take a moment to process 