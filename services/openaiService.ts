export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

/**
 * Send a chat message to OpenAI API
 * @param messages - Array of chat messages (conversation history)
 * @param systemPrompt - Optional system prompt to set the assistant's behavior
 * @returns Promise<string> - The assistant's response
 */
export const sendChatMessage = async (
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.');
  }

  try {
    const requestMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cost-effective model, can be changed to 'gpt-3.5-turbo' or 'gpt-4'
        messages: requestMessages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error occurred' } }));
      throw new Error(error.error?.message || 'Failed to get response from OpenAI');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response from AI';
  } catch (error: any) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
};

