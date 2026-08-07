import {
  createContext, useCallback, useContext, useEffect, useRef, useState
} from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getConversations } from '../api/chat';
import { getUnreadCount } from '../api/notifications';
import type { MessageVO } from '../api/chat';
import { SSE_ENDPOINT } from '../config';

interface ChatSseContextValue {
  connected: boolean;
  unreadTotal: number;
  notificationUnread: number;
  refreshUnread: () => void;
  refreshNotificationUnread: () => void;
  setActiveConversation: (conversationId: string | null) => void;
  subscribe: (listener: (message: MessageVO) => void) => () => void;
}

const ChatSseContext = createContext<ChatSseContextValue | null>(null);

export function ChatSseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const activeConversationRef = useRef<string | null>(null);
  const listenersRef = useRef(new Set<(message: MessageVO) => void>());

  const refreshUnread = useCallback(() => {
    getConversations()
      .then(conversations => {
        const total = (conversations || []).reduce((sum, conversation) =>
          sum + (conversation.unreadCount || 0), 0);
        setUnreadTotal(total);
      })
      .catch(() => {});
  }, []);

  const refreshNotificationUnread = useCallback(() => {
    getUnreadCount().then(setNotificationUnread).catch(() => {});
  }, []);

  const setActiveConversation = useCallback((conversationId: string | null) => {
    activeConversationRef.current = conversationId;
    refreshUnread();
  }, [refreshUnread]);

  const subscribe = useCallback((listener: (message: MessageVO) => void) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const eventSource = new EventSource(SSE_ENDPOINT, { withCredentials: true });
    const handleMessage = (event: MessageEvent<string>) => {
      try {
        const message: MessageVO = JSON.parse(event.data);
        listenersRef.current.forEach(listener => listener(message));
        if (message.conversationId !== activeConversationRef.current) {
          setUnreadTotal(previous => previous + 1);
        }
      } catch {
        return;
      }
    };
    const handleNotification = () => {
      setNotificationUnread(previous => previous + 1);
    };

    eventSource.onopen = () => {
      setConnected(true);
      refreshUnread();
      refreshNotificationUnread();
    };
    eventSource.onerror = () => setConnected(false);
    eventSource.addEventListener('message', handleMessage as EventListener);
    eventSource.addEventListener('notification', handleNotification);

    return () => {
      eventSource.removeEventListener('message', handleMessage as EventListener);
      eventSource.removeEventListener('notification', handleNotification);
      eventSource.close();
      setConnected(false);
      setUnreadTotal(0);
      setNotificationUnread(0);
    };
  }, [user?.id, refreshUnread, refreshNotificationUnread]);

  return (
    <ChatSseContext.Provider value={{
      connected, unreadTotal, notificationUnread,
      refreshUnread, refreshNotificationUnread, setActiveConversation, subscribe,
    }}>
      {children}
    </ChatSseContext.Provider>
  );
}

export const useChatSse = () => {
  const context = useContext(ChatSseContext);
  if (!context) throw new Error('useChatSse must be used within ChatSseProvider');
  return context;
};
