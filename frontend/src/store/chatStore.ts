import { create } from 'zustand';
import { ChatMessage, SuggestedPrompt } from './types';
import { getMockAiResponse } from '../services/mockXaiService';

export const INITIAL_SUGGESTIONS: SuggestedPrompt[] = [
  { id: '1', text: 'Analyze climate data for my region.' },
  { id: '2', text: 'Generate a sustainable city plan.' },
  { id: '3', text: 'Find out sustainable paths with a participatory decision in nature area.' },
  { id: '4', text: 'Generate a sustainable city plan.' },
];

export interface UserProfile {
  name: string;
  role: string;
  email: string;
}

interface ChatState {
  // Navigation & Auth
  currentPage: 'landing' | 'chat' | 'map';
  isAuthenticated: boolean;
  user: UserProfile | null;

  // Chat State
  messages: ChatMessage[];
  inputValue: string;
  isTyping: boolean;
  sidebarOpen: boolean;
  activeNavTab: string;

  // Actions
  setCurrentPage: (page: 'landing' | 'chat' | 'map') => void;
  setIsAuthenticated: (val: boolean) => void;
  toggleAuth: () => void;
  setInputValue: (val: string) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveNavTab: (tab: string) => void;
  sendQuery: (text?: string) => Promise<void>;
  resetToWelcome: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Default landing page
  currentPage: 'landing',
  isAuthenticated: false,
  user: {
    name: 'Dr. Aris Thorne',
    role: 'Lead Conservationist',
    email: 'aris.thorne@lumina-ai.eco',
  },

  messages: [],
  inputValue: '',
  isTyping: false,
  sidebarOpen: true,
  activeNavTab: 'new_chat',

  setCurrentPage: (currentPage) => set({ currentPage }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  toggleAuth: () => set((state) => ({ isAuthenticated: !state.isAuthenticated })),

  setInputValue: (inputValue: string) => set({ inputValue }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen: boolean) => set({ sidebarOpen }),
  setActiveNavTab: (activeNavTab: string) => set({ activeNavTab }),

  sendQuery: async (customText?: string) => {
    const textToSend = (customText || get().inputValue).trim();
    if (!textToSend || get().isTyping) return;

    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      inputValue: '',
      isTyping: true,
    }));

    try {
      const aiResponse = await getMockAiResponse(textToSend);
      set((state) => ({
        messages: [...state.messages, aiResponse],
        isTyping: false,
      }));
    } catch {
      set({ isTyping: false });
    }
  },

  resetToWelcome: () => set({ messages: [], inputValue: '', isTyping: false }),
}));
