import client from './client';

export interface MessageVO {
  id: number;
  conversationId: string;
  senderId: number;
  senderName: string;
  receiverId: number;
  content: string;
  isRead: number;
  createdAt: string;
}

export interface ConversationVO {
  conversationId: string;
  otherUserId: number;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export const startConversation = (targetUserId: number) =>
  client.post(`/chat/start/${targetUserId}`).then(r => r.data.data as { conversationId: string });

export const getConversations = () =>
  client.get('/chat/conversations').then(r => r.data.data as ConversationVO[]);

export const getMessages = (conversationId: string, page = 1, size = 50) =>
  client.get(`/chat/messages/${conversationId}`, { params: { page, size } })
    .then(r => r.data.data);

export const sendMessage = (conversationId: string, receiverId: number, content: string) =>
  client.post('/chat/send', { conversationId, receiverId, content })
    .then(r => r.data.data as MessageVO);

export const markRead = (id: number) =>
  client.put(`/chat/messages/${id}/read`).then(r => r.data.data);
