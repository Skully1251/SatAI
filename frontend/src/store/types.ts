export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  followUpQuestion?: string;
  keyInsights?: string[];
}

export interface SuggestedPrompt {
  id: string;
  text: string;
}
