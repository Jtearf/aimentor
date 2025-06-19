/**
 * API utilities for interacting with the backend services
 * Production-ready implementation with error handling, retry logic,
 * and proper authentication token management.
 */

import { supabase, getSessionState } from './supabase';

// Get API base URL from environment or use default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Default request timeout in milliseconds
const DEFAULT_TIMEOUT_MS = 30000;

// Max retry attempts for failed requests
const MAX_RETRY_ATTEMPTS = 3;

// Delay between retries in ms (exponential backoff formula: baseDelay * (2^retryAttempt))
const RETRY_BASE_DELAY_MS = 500;

/**
 * API Error class with additional context
 */
export class ApiError extends Error {
  status: number;
  statusText: string;
  data?: any;
  isPaymentRequired?: boolean;
  isAuthError?: boolean;

  constructor(message: string, status: number, statusText: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.isPaymentRequired = status === 402;
    this.isAuthError = status === 401 || status === 403;
  }
}

/**
 * Log API errors to monitoring service
 * Replace with your production error monitoring solution
 */
const logApiError = (error: Error, endpoint: string, options?: unknown) => {
  // In development, log to console
  if (import.meta.env.DEV) {
    console.error(`API Error (${endpoint}):
`, error, options);
    return;
  }

  // In production, you would send this to your error monitoring service
  // For example: Sentry, LogRocket, etc.
  // sendToErrorMonitoring(error, { endpoint, options });
  
  // For now we'll just console.log in production too
  console.error(`API Error (${endpoint}):
`, error);
};

/**
 * Generic fetch wrapper with authentication, retries and error handling
 */
export const fetchWithAuth = async (
  endpoint: string, 
  options: RequestInit = {},
  retryAttempt = 0,
  customTimeout = DEFAULT_TIMEOUT_MS
): Promise<Response> => {
  try {
    const session = await getSessionState();
    
    // Check if authenticated for protected routes
    if (endpoint.includes('/api/') && !endpoint.includes('/auth/') && !session) {
      throw new ApiError('Authentication required', 401, 'Unauthorized');
    }
    
    // Create headers object with proper typing
    const headers = new Headers(options.headers || {});
    
    // Set default content type if not already set
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Add auth token if available
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), customTimeout);
    
    // Make the request
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    // Handle 401/403 by attempting to refresh token once
    if ((response.status === 401 || response.status === 403) && retryAttempt === 0) {
      // Try refreshing the session
      const { error } = await supabase.auth.refreshSession();
      
      if (!error) {
        // Retry with refreshed token
        return fetchWithAuth(endpoint, options, 1);
      }
    }

    // Handle server errors with retries
    if (response.status >= 500 && retryAttempt < MAX_RETRY_ATTEMPTS) {
      // Exponential backoff
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, retryAttempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithAuth(endpoint, options, retryAttempt + 1);
    }

    // Handle errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail || `API error: ${response.status} ${response.statusText}`,
        response.status,
        response.statusText,
        errorData
      );
    }

    return response;
  } catch (error: unknown) {
    // Handle abort errors (timeouts)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        'Request timeout', 
        408, 
        'Request Timeout',
        { originalError: error }
      );
    }
    
    // Log the error
    logApiError(
      error instanceof Error ? error : new Error(String(error)), 
      endpoint, 
      options
    );
    
    // Rethrow API errors
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Convert other errors to ApiError
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown API error', 
      500, 
      'Internal Error',
      { originalError: error }
    );
  }
};

/**
 * Send a chat message and receive a streaming response
 */
export const streamChatMessage = async (
  message: string,
  personaId: string,
  conversationId?: string,
  onChunk?: (chunk: string) => void,
  onDone?: () => void,
  onError?: (error: ApiError) => void
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for streaming

  try {
    const session = await getSessionState();
    if (!session) {
      throw new ApiError('Authentication required', 401, 'Unauthorized');
    }

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'Accept': 'text/event-stream',
      } as HeadersInit,
      body: JSON.stringify({
        message,
        persona_id: personaId,
        conversation_id: conversationId || null
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail || `API error: ${response.status} ${response.statusText}`,
        response.status,
        response.statusText,
        errorData
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new ApiError('Response body reader not available', 500, 'Stream Error');
    }

    const decoder = new TextDecoder();
    let accumulatedData = '';

    // Process the stream
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      accumulatedData += chunk;

      // Process SSE format (data: CHUNK\n\n)
      const lines = accumulatedData.split('\n\n');
      accumulatedData = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        
        const dataLine = line.replace(/^data: /, '');
        if (dataLine === '[DONE]') {
          onDone?.();
          clearTimeout(timeoutId);
          return;
        }
        
        try {
          // Try to parse JSON if applicable
          if (dataLine.startsWith('{') && dataLine.endsWith('}')) {
            const parsedData = JSON.parse(dataLine);
            if (parsedData.error) {
              throw new ApiError(parsedData.error, 500, 'Stream Error', parsedData);
            }
            onChunk?.(parsedData.content || parsedData.text || dataLine);
          } else {
            onChunk?.(dataLine);
          }
        } catch (parseError) {
          // If parsing fails, just send the raw data
          onChunk?.(dataLine);
        }
      }
    }
    
    clearTimeout(timeoutId);
    onDone?.();
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    
    // Handle abort errors (timeouts)
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new ApiError(
        'Stream timeout', 
        408, 
        'Request Timeout', 
        { originalError: error }
      );
      onError?.(timeoutError);
      throw timeoutError;
    }

    // Log the error
    logApiError(
      error instanceof Error ? error : new Error(String(error)), 
      '/api/chat', 
      { message, personaId, conversationId }
    );
    
    // Convert to ApiError if needed
    const apiError = error instanceof ApiError ? 
      error : 
      new ApiError(
        error instanceof Error ? error.message : 'Unknown streaming error', 
        500, 
        'Stream Error', 
        { originalError: error }
      );
    
    onError?.(apiError);
    throw apiError;
  }
};

/**
 * Get user's remaining credits
 */
export const getUserCredits = async (): Promise<number> => {
  try {
    const response = await fetchWithAuth('/api/users/credits');
    const data = await response.json();
    return data.credits_left || 0;
  } catch (error: unknown) {
    logApiError(error instanceof Error ? error : new Error('Unknown error'), '/api/users/credits');
    // Return 0 as fallback to avoid UI errors
    return 0;
  }
};

/**
 * Get all conversations for current user
 */
export const getConversations = async () => {
  const response = await fetchWithAuth('/api/conversations');
  return response.json();
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (conversationId: string) => {
  await fetchWithAuth(`/api/conversations/${conversationId}`, {
    method: 'DELETE',
  });
};
