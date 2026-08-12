import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Snackbar } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useChatSse } from '../store/ChatSseContext';
import { getConversations, getLatestMessages, getMessagesBefore, markConversationRead, sendMessage } from '../api/chat';
import type { ConversationVO, MessageVO } from '../api/chat';
import { getApiErrorMessage } from '../api/errors';
import { useTranslation } from 'react-i18next';
import ConversationList from '../components/chat/ConversationList';
import MessagePanel from '../components/chat/MessagePanel';

const PAGE_SIZE = 50;

function decodeQueryValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function Chat() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { subscribe, setActiveConversation, refreshUnread } = useChatSse();
  const [searchParams] = useSearchParams();
  const targetUserId = Number(searchParams.get('to')) || null;
  const targetName = searchParams.get('name');
  const [conversations, setConversations] = useState<ConversationVO[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(searchParams.get('conv'));
  const [messages, setMessages] = useState<MessageVO[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedConvRef = useRef<string | null>(null);
  const oldestMessageIdRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      setConversations(await getConversations());
    } catch (errorValue) {
      setConversations([]);
      setSendError(getApiErrorMessage(errorValue, t('chat.loadConversationsFailed')));
    }
  }, [t]);

  const loadLatestMessages = useCallback(async (conversationId: string) => {
    const data = await getLatestMessages(conversationId, PAGE_SIZE, abortRef.current?.signal);
    oldestMessageIdRef.current = data.records[0]?.id ?? null;
    setHasMore(data.hasMore);
    return data.records;
  }, []);

  const loadEarlier = async () => {
    const conversationId = selectedConv;
    if (!conversationId || loadingMore || oldestMessageIdRef.current == null) return;
    setLoadingMore(true);
    try {
      const data = await getMessagesBefore(conversationId, oldestMessageIdRef.current, PAGE_SIZE, abortRef.current?.signal);
      if (selectedConvRef.current !== conversationId) return;
      setMessages(previous => [...data.records, ...previous]);
      oldestMessageIdRef.current = data.records[0]?.id ?? oldestMessageIdRef.current;
      setHasMore(data.hasMore);
    } catch (errorValue) { setSendError(getApiErrorMessage(errorValue, t('chat.loadEarlierFailed'))); }
    finally { setLoadingMore(false); }
  };

  useEffect(() => { selectedConvRef.current = selectedConv; }, [selectedConv]);

  useEffect(() => {
    if (!selectedConv) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    loadLatestMessages(selectedConv).then(data => {
      if (controller.signal.aborted) return;
      setMessages(data);
      setActiveConversation(selectedConv);
      markConversationRead(selectedConv).then(() => { void loadConversations(); refreshUnread(); }).catch(() => {});
      window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }).catch(() => { if (!controller.signal.aborted) setSendError(t('chat.loadMessagesFailed')); });
    return () => controller.abort();
  }, [selectedConv, loadLatestMessages, loadConversations, refreshUnread, setActiveConversation, t]);

  useEffect(() => {
    const unsubscribe = subscribe(message => {
      void loadConversations();
      if (message.conversationId !== selectedConvRef.current) return;
      setMessages(previous => previous.some(current => current.id === message.id) ? previous : [...previous, message]);
      void markConversationRead(message.conversationId).then(refreshUnread).catch(() => {});
      window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return unsubscribe;
  }, [subscribe, loadConversations, refreshUnread]);

  useEffect(() => () => setActiveConversation(null), [setActiveConversation]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadConversations().finally(() => setLoading(false));
  }, [user, loadConversations]);

  const displayConversations = useMemo(() => {
    if (!selectedConv || !targetUserId || !targetName || conversations.some(item => item.conversationId === selectedConv)) return conversations;
    const otherUserName = decodeQueryValue(targetName);
    return [{ conversationId: selectedConv, otherUserId: targetUserId, otherUserName, otherUserAvatar: undefined, lastMessage: '', lastMessageTime: '', unreadCount: 0 }, ...conversations];
  }, [conversations, selectedConv, targetUserId, targetName]);

  const selectedUser = displayConversations.find(item => item.conversationId === selectedConv);

  const handleSend = async () => {
    if (!input.trim() || !selectedConv) return;
    const receiverId = selectedUser?.otherUserId ?? targetUserId;
    if (!receiverId) return;
    try {
      const sent = await sendMessage(selectedConv, receiverId, input.trim());
      setMessages(previous => previous.some(message => message.id === sent.id) ? previous : [...previous, sent]);
      setInput(''); void loadConversations();
      window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (errorValue) { setSendError(getApiErrorMessage(errorValue, t('chat.sendFailed'))); }
  };

  if (!user) return <Alert severity="warning">{t('chat.pleaseLogin')}</Alert>;
  return <Box sx={{ display: 'flex', height: 'calc(100vh - 140px)', gap: 2 }}>
    <ConversationList conversations={displayConversations} selected={selectedConv} loading={loading} onSelect={setSelectedConv} />
    <MessagePanel userId={user.id} conversation={selectedUser} messages={messages} input={input}
      hasMore={hasMore} loadingMore={loadingMore} onInputChange={setInput} onLoadEarlier={loadEarlier}
      onSend={handleSend} endRef={messagesEndRef} />
    <Snackbar open={Boolean(sendError)} autoHideDuration={3000} onClose={() => setSendError('')} message={sendError} />
  </Box>;
}
