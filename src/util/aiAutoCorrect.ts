import { openrouter } from '../openrouter.ts';

// Simple notification function - you can replace this with a proper UI notification if available
function showNotification(message: string, type: 'info' | 'error' = 'info') {
  console.log(`[Notification - ${type}]: ${message}`);
  // If you have a toast or notification system, use it here
  // For example: toast.show(message, { type });
}

/**
 * Validates the OpenRouter configuration and tests the connection
 * @returns Promise<boolean> indicating if the configuration is valid
 */
export async function validateOpenRouterConfig(): Promise<boolean> {
  console.log('[AI Correct] Validating OpenRouter configuration...');
  
  // Check if required configuration values are present
  if (!openrouter.endpoint || !openrouter.apiKey) {
    console.error('[AI Correct] Missing required OpenRouter configuration:', 
      !openrouter.endpoint ? 'endpoint' : '', 
      !openrouter.apiKey ? 'apiKey' : ''
    );
    return false;
  }
  
  // Check if the model is specified
  if (!openrouter.model) {
    console.error('[AI Correct] No model specified in OpenRouter configuration');
    return false;
  }

  try {
    // Make a simple request to validate the API key
    const response = await fetch(`${openrouter.endpoint}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openrouter.apiKey}`,
        'HTTP-Referer': openrouter.siteUrl || window.location.origin,
        'X-Title': openrouter.siteName || 'AiEditor'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Correct] OpenRouter API validation failed: ${response.status}`, errorText);
      return false;
    }

    const data = await response.json();
    console.log('[AI Correct] OpenRouter API validation successful, available models:', data);
    
    // Check if the configured model is available
    const modelAvailable = data.data?.some((model: any) => 
      model.id === openrouter.model || 
      model.id.includes(openrouter.model)
    );
    
    if (!modelAvailable) {
      console.warn(`[AI Correct] Configured model "${openrouter.model}" not found in available models`);
    }
    
    return true;
  } catch (error) {
    console.error('[AI Correct] Error validating OpenRouter configuration:', error);
    return false;
  }
}

/**
 * Sends text to OpenRouter API for AI-powered corrections
 * @param text Text to be corrected
 * @returns Corrected text or original text if error occurs
 */
export async function aiCorrectText(text: string, useFallback = false, context?: string): Promise<string> {
  if (!text || text.trim().length === 0) {
    return text;
  }

  // Use fallback model if specified
  const modelToUse = useFallback && openrouter.fallbackModel ? openrouter.fallbackModel : openrouter.model;

  try {
    console.log(`[AI Correct] Sending request to OpenRouter API with model: ${modelToUse}`);
    
    // Create a more focused prompt for auto-correction
    const useContext = context ? `\nContext: ${context}` : '';
    const prompt = `Please correct any grammatical errors, spelling mistakes, or improve the clarity of the following text. Only make necessary changes and preserve the original meaning and style:${useContext}\n\nText: "${text}"\n\nCorrected:`;

    const requestBody = {
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content: 'You are a text correction assistant. Your job is to fix typos, grammar issues, and improve text while maintaining the original meaning. Only return the corrected text with no explanations or additions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.1, // Low temperature for more deterministic corrections
    };
    
    console.log('[AI Correct] Request payload:', JSON.stringify(requestBody));
    
    const response = await fetch(openrouter.endpoint + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouter.apiKey}`,
        'HTTP-Referer': openrouter.siteUrl,
        'X-Title': openrouter.siteName
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`[AI Correct] Response status: ${response.status}`);
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error('OpenRouter API error:', response.status, responseText);
      
      // Try fallback model if primary model failed and we haven't already tried the fallback
      if (!useFallback && openrouter.fallbackModel) {
        console.log(`[AI Correct] Primary model failed, trying fallback model: ${openrouter.fallbackModel}`);
        return aiCorrectText(text, true);
      }
      
      showNotification(`Auto-correction API error: ${response.status}`, 'error');
      return text; // Return original text if API call fails
    }

    const data = await response.json();
    console.log('[AI Correct] Response data:', JSON.stringify(data));
    
    const correctedText = data.choices?.[0]?.message?.content || text;
    console.log(`[AI Correct] Original: "${text}" -> Corrected: "${correctedText}"`);
    
    // Remove any quotation marks that might have been included by the AI
    return correctedText.replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Error using OpenRouter for text correction:', error);
    
    // Try fallback model if primary model failed and we haven't already tried the fallback
    if (!useFallback && openrouter.fallbackModel) {
      console.log(`[AI Correct] Error with primary model, trying fallback model: ${openrouter.fallbackModel}`);
      return aiCorrectText(text, true);
    }
    
    showNotification('Auto-correction failed - check console for details', 'error');
    return text; // Return original text if error occurs
  }
}

/**
 * Creates a debounced version of the AI correct function
 * @param waitTime Time in ms to debounce
 * @returns Debounced function
 */
function createDebouncedAiCorrect(waitTime = 1000) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function(text: string, useFallback = false, context?: string): Promise<string> {
    return new Promise((resolve) => {
      // Clear previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Set new timeout
      timeoutId = setTimeout(async () => {
        try {
          const result = await aiCorrectText(text, useFallback, context);
          resolve(result);
        } catch (error) {
          console.error('[debouncedAiCorrect] Error:', error);
          resolve(text); // Return original text on error
        }
      }, waitTime);
    });
  };
}

// Export a singleton instance of the debounced AI correction function
export const debouncedAiCorrect = createDebouncedAiCorrect(1000);

// Remove the duplicate declaration below
// Update the function signature of the debounced version to match aiCorrectText 
// by redefining it with the same signature
// export const debouncedAiCorrect = debounce(
//   (text: string, useFallback = false, context?: string) => 
//     aiCorrectText(text, useFallback, context), 
//   500
// ); 