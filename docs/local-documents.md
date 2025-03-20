# Local Document Storage

AiEditor provides a powerful local document storage feature that allows users to save, manage, and access documents directly from their browser. This feature enhances productivity by providing a way to work on multiple documents and access them from any device.

## Key Features

- **Save Documents Locally**: Store documents in your browser's local storage for easy access
- **Auto-save**: Automatically save your work at regular intervals
- **Document Management**: Search, organize, and manage your local documents
- **Import/Export**: Share documents by exporting and importing JSON files
- **Document Metadata**: Track creation and modification dates

## Usage

The local document storage feature can be accessed through the "Local Documents" button in the toolbar. Clicking this button opens a dropdown menu with options to:

- Create a new document
- Save the current document
- View and search existing documents
- Import or export documents

## Configuration

AiEditor provides several configuration options for the local document storage feature:

```typescript
new AiEditor({
    // ... other configuration options ...
    
    // Configure local document storage
    localDocs: {
        storagePrefix: 'aieditor',    // Prefix for localStorage keys
        maxDocuments: 100,            // Maximum number of documents to store
        autoSaveInterval: 30000,      // Auto-save interval in milliseconds (30 seconds)
        onDocumentSaved: (doc) => {   // Callback when a document is saved
            console.log('Document saved:', doc.id, doc.title);
        },
        onDocumentLoaded: (doc) => {  // Callback when a document is loaded
            console.log('Document loaded:', doc.id, doc.title);
        },
        onDocumentDeleted: (docId) => { // Callback when a document is deleted
            console.log('Document deleted:', docId);
        }
    }
});
```

## Benefits of Local Document Storage

1. **Offline Access**: Documents are stored in your browser's localStorage, so you can access them even without an internet connection.

2. **Privacy**: Your documents remain on your device, giving you full control over your data.

3. **Performance**: Local storage provides fast access to your documents without network delays.

4. **Easy Sharing**: Export documents as JSON files that can be shared with others and imported into their AiEditor.

5. **Cross-Device Access**: When using the same browser on different devices, your documents will be available anywhere.

## Technical Implementation

The local document storage feature uses the browser's localStorage API to store documents. Each document is stored as a JSON object with the following structure:

```typescript
interface LocalDocument {
    id: string;           // Unique document ID
    title: string;        // Document title
    content: any;         // Document content in JSON format
    createdAt: number;    // Creation timestamp
    updatedAt: number;    // Last update timestamp
    tags?: string[];      // Optional tags for organization
    excerpt?: string;     // Document excerpt for preview
}
```

The feature manages a list of documents and provides APIs for creating, updating, loading, and deleting documents.

## Storage Limitations

Please note that browser localStorage has limitations:
- Storage size is typically limited to 5-10MB per domain
- Documents are stored only in the current browser on the current device
- Clearing browser data will remove stored documents

For more critical documents, we recommend using the export feature to create backups or using cloud storage solutions. 