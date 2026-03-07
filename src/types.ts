// ============================================================================
// MendBuddy Chat SDK Types
// ============================================================================

export type EmbedTheme = 'light' | 'dark' | 'auto';
export type EmbedPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export type EmbedButtonIcon = 'chat' | 'message' | 'help' | 'custom';

export interface PreChatField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface BusinessHours {
  timezone: string;
  schedule: {
    monday?: { start: string; end: string } | null;
    tuesday?: { start: string; end: string } | null;
    wednesday?: { start: string; end: string } | null;
    thursday?: { start: string; end: string } | null;
    friday?: { start: string; end: string } | null;
    saturday?: { start: string; end: string } | null;
    sunday?: { start: string; end: string } | null;
  };
}

export interface EmbedConfigPublic {
  embed_id: string;
  theme: EmbedTheme;
  primary_color: string;
  position: EmbedPosition;
  button_icon: EmbedButtonIcon;
  custom_icon_url: string | null;
  logo_url: string | null;
  welcome_message: string;
  placeholder_text: string;
  offline_message: string;
  pre_chat_enabled: boolean;
  pre_chat_fields: PreChatField[];
  auto_open_delay_ms: number | null;
  show_powered_by: boolean;
  allow_attachments: boolean;
  business_hours_enabled: boolean;
  business_hours: BusinessHours | null;
  is_online: boolean;
  assistant_name: string;
  default_messages: string[];
  user_bg_color: string;
  assistant_bg_color: string;
  button_color: string;
  window_width: string;
  window_height: string;
  text_size: string;
  brand_image_url: string | null;
  chat_icon: string;
  widget_position: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  sources?: Source[];
}

export interface Source {
  document_id: string;
  document_name: string;
  pages: number[];
}

export interface ChatResponse {
  thread_id: string;
  message: {
    id: string;
    role: 'assistant';
    content: string;
    created_at: string;
  };
  sources?: Source[];
}

export interface MendBuddyConfig {
  embedId: string;
  apiUrl?: string;
  position?: 'bottom-right' | 'bottom-left';
  autoOpen?: boolean;
  onReady?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (message: { role: string; content: string }) => void;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  threadId: string | null;
  preChatSubmitted: boolean;
}

export interface UseChatReturn extends ChatState {
  sendMessage: (content: string) => Promise<void>;
  submitPreChat: (fields: Record<string, string>) => Promise<void>;
  clearError: () => void;
}
