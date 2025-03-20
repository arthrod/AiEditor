/**
 * Prompt templates for the Smart Paper Fill feature
 */

/**
 * Main prompt for analyzing and filling form fields
 */
export const PAPER_FILL_PROMPT = `<content>{content}</content>

You are assisting with filling out a document or form. Analyze the content provided, which represents a document with blank fields or sections that need to be completed.

Follow these steps:
1. Identify all EMPTY fields or sections that need to be filled. Look for blank spaces, underscores (e.g. "_____"), square brackets, form fields, or any other indicators of information that needs to be provided.
2. For each empty field, determine the most appropriate content based on context and common professional standards.
3. ONLY fill in EMPTY fields with relevant, realistic, and appropriate information.
4. DO NOT MODIFY OR OVERWRITE ANY EXISTING TEXT. Only add content where it's clearly missing.
5. Maintain a consistent style and tone throughout the document.
6. For any fields requiring specific expertise (legal, medical, technical), provide professionally appropriate content.

Return the complete document with all empty fields appropriately filled while preserving all existing content. Maintain all formatting and structure of the original document.

Important: 
- If specific personal information would be required (names, addresses, IDs), use realistic but fictional data.
- NEVER REPLACE OR MODIFY ANY PRE-FILLED INFORMATION. Only add content to empty fields.
`;

/**
 * Main prompt for analyzing and filling form fields with user context
 */
export const PAPER_FILL_WITH_CONTEXT_PROMPT = `<content>{content}</content>
<user_context>{userContext}</user_context>

You are assisting with filling out a document or form. Analyze the content provided, which represents a document with blank fields or sections that need to be completed.

The user has provided additional context about the document: {userContext}

Follow these steps:
1. Identify all EMPTY fields or sections that need to be filled. Look for blank spaces, underscores (e.g. "_____"), square brackets, form fields, or any other indicators of information that needs to be provided.
2. For each empty field, determine the most appropriate content based on the user's context and common professional standards.
3. ONLY fill in EMPTY fields with relevant, realistic, and appropriate information that aligns with the user's context.
4. DO NOT MODIFY OR OVERWRITE ANY EXISTING TEXT. Only add content where it's clearly missing.
5. Maintain a consistent style and tone throughout the document.
6. For any fields requiring specific expertise (legal, medical, technical), provide professionally appropriate content.

Return the complete document with all empty fields appropriately filled while preserving all existing content. Maintain all formatting and structure of the original document.

Important: 
- If specific personal information would be required (names, addresses, IDs), use realistic but fictional data that aligns with the user's context.
- NEVER REPLACE OR MODIFY ANY PRE-FILLED INFORMATION. Only add content to empty fields.
`;

/**
 * Prompt for analyzing form structure to identify fields
 */
export const PAPER_ANALYZE_PROMPT = `<content>{content}</content>

Analyze this document to identify all empty form fields, blank sections, or areas that need to be completed.
Focus only on fields that are currently empty or have placeholder text.

For each empty field or section identified, provide:
1. A label or description of what information is required
2. The position or context where this field appears in the document
3. The type of data expected (text, number, date, selection, etc.)
4. Whether it appears to be required or optional

Format your response as a structured list of fields with their details.
Do not include fields that already have content - focus only on empty fields that need to be filled out.
`;

/**
 * Prompt for analyzing form structure to identify fields with user context
 */
export const PAPER_ANALYZE_WITH_CONTEXT_PROMPT = `<content>{content}</content>
<user_context>{userContext}</user_context>

Analyze this document to identify all empty form fields, blank sections, or areas that need to be completed.
Focus only on fields that are currently empty or have placeholder text.
Consider the user's context: {userContext}

For each empty field or section identified, provide:
1. A label or description of what information is required
2. The position or context where this field appears in the document
3. The type of data expected (text, number, date, selection, etc.)
4. Whether it appears to be required or optional
5. Suggestions for how to fill this field based on the user's context

Format your response as a structured list of fields with their details.
Do not include fields that already have content - focus only on empty fields that need to be filled out.
`;

/**
 * Prompt for filling specific fields in a document
 */
export const FIELD_FILL_PROMPT = `<content>{content}</content>

You are to fill in the following specific empty field in a document:
Field: {fieldName}
Context: {fieldContext}

Generate appropriate content for this field that:
1. Matches the expected data type and format
2. Is consistent with the overall document context
3. Uses realistic but fictional data if personal information is needed
4. Is professionally written and appropriate for formal documents

Return only the content for this specific field, nothing else.
If this field already contains text, DO NOT modify it - return the existing text as is.
`;

/**
 * Prompt for filling specific fields in a document with user context
 */
export const FIELD_FILL_WITH_CONTEXT_PROMPT = `<content>{content}</content>
<user_context>{userContext}</user_context>

You are to fill in the following specific empty field in a document:
Field: {fieldName}
Context: {fieldContext}
User Context: {userContext}

Generate appropriate content for this field that:
1. Matches the expected data type and format
2. Is consistent with the overall document context
3. Aligns with the user's provided context
4. Uses realistic but fictional data if personal information is needed
5. Is professionally written and appropriate for formal documents

Return only the content for this specific field, nothing else.
If this field already contains text, DO NOT modify it - return the existing text as is.
`; 