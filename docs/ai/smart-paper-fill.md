# Smart Paper Fill - AI Document Completion

Smart Paper Fill is a powerful AI-powered feature in AiEditor that helps automatically fill out forms, templates, and documents with appropriate content.

## Key Features

- **AI-Powered Form Filling**: Automatically complete fields, sections, and forms with contextually appropriate content
- **Field Analysis**: Identify and understand the structure and requirements of form fields
- **Context-Aware**: Provide additional context to help AI understand the document better
- **Selection Support**: Work with either the entire document or just selected text
- **Flexible Integration**: Available as a toolbar component in AiEditor

## How to Use Smart Paper Fill

### Working with the Entire Document

1. Click the Smart Paper Fill icon in the toolbar
2. Optionally provide contextual information in the "Context" field
3. Click "Analyze Fields" to identify form structure, or "Fill Document" to directly populate content

### Working with Selected Text

1. Select a portion of your document text
2. Click the Smart Paper Fill icon in the toolbar
3. Notice the "Working with selected text" indicator
4. Provide optional context
5. Click "Analyze Selection" or "Fill Selection"

The Smart Paper Fill interface will automatically detect when you have text selected and adjust its behavior accordingly, only processing the selected portion of your document.

## Use Cases

- **Forms**: Complete standard forms with appropriate information
- **Templates**: Fill in document templates with realistic content
- **Structured Documents**: Complete sections of structured documents like reports or papers
- **Content Creation**: Generate appropriate content for specific sections of your document

## Example

Consider this partially completed medical form:

```html
<h2>Patient Intake Form</h2>

<div class="field-group">
  <label>Patient Name:</label>
  <div class="field">___________________</div>
</div>

<div class="field-group">
  <label>Date of Birth:</label>
  <div class="field">___________________</div>
</div>

<div class="field-group">
  <label>Medical History:</label>
  <div class="field">___________________</div>
</div>
```

With Smart Paper Fill, you can:

1. Select just the "Medical History" field if you only want to fill that section
2. Provide context like "This is for a 45-year-old patient with diabetes and hypertension"
3. Click "Fill Selection" to have AI generate appropriate content just for that field

Smart Paper Fill makes document completion faster and easier, adapting to your specific needs whether you're working with entire documents or focused on specific sections. 