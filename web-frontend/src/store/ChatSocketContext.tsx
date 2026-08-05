import {
  createContext, useCallback, useContext, useEffect, useRef, useState
} from 'react';
import type { ReactNode } from 'react';
import { Client, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from './AuthContext';
import { getConversations } from '../api/chat';
import { getUnreadCount } from '../api/notifications';
import type { MessageVO } from '../api/chat';
import { WS_ENDPOINT } from '../config';

interface ChatSocketContextValue {
  connected: boolean;
  unreadTotal: number;
  notificationUnread: number;
  refreshUnread: () => void;
  refreshNotificationUnread: () => void;
  setActiveConversation: (conversationId: string | null) => void;
  subscribe: (listener: (message: MessageVO) => void) => () => void;
}

const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

/**
 * 全局 WebSocket 连接：登录后立即建立，任何页面都能实时收到消息，
 * 未读消息通过 unreadTotal 驱动侧边栏「对话」红点。
 */
export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const activeConversationRef = useRef<string | null>(null);
  const listenersRef = useRef(new Set<(message: MessageVO) => void>());

  const refreshUnread = useCallback(() => {
    getConversations()
      .then(conversations => {
        const total = (conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setUnreadTotal(total);
      })
      .catch(() => { /* 忽略加载失败 */ });
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
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let disposed = false;
    let subscriptions: StompSubscription[] = [];
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_ENDPOINT),
      reconnectDelay: 5000,
      onConnect: () => {
        if (disposed) {
          void client.deactivate();
          return;
        }
        subscriptions = [];
        setConnected(true);
        subscriptions.push(client.subscribe('/user/queue/messages', (frame) => {
          try {
            const message: MessageVO = JSON.parse(frame.body);
            listenersRef.current.forEach(listener => listener(message));
            // 正在查看的会话不叠加红点
            if (message.conversationId !== activeConversationRef.current) {
              setUnreadTotal(prev => prev + 1);
            }
          } catch {
            // 忽略异常帧
          }
        }));
        // 通知实时推送：收到即红点 +1
        subscriptions.push(client.subscribe('/user/queue/notifications', () => {
          setNotificationUnread(prev => prev + 1);
        }));
        refreshUnread();
        refreshNotificationUnread();
      },
      onStompError: () => setConnected(false),
      onWebSocketClose: () => {
        subscriptions = [];
        setConnected(false);
      },
    });
    client.activate();
    return () => {
      disposed = true;
      subscriptions.forEach(subscription => subscription.unsubscribe());
      subscriptions = [];
      void client.deactivate();
      setConnected(false);
      setUnreadTotal(0);
      setNotificationUnread(0);
    };
  }, [user?.id, refreshUnread, refreshNotificationUnread]);

  return (
    <ChatSocketContext.Provider value={{
      connected, unreadTotal, notificationUnread,
      refreshUnread, refreshNotificationUnread, setActiveConversation, subscribe,
    }}>
      {children}
    </ChatSocketContext.Provider>
  );
}

export const useChatSocket = () => {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) throw new Error('useChatSocket must be used within ChatSocketProvider');
  return ctx;
};
