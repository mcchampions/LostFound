import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, Button, List, ListItemButton,
  ListItemText, ListItemAvatar, Avatar, Divider, Badge, CircularProgress, Alert, Snackbar
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '../store/AuthContext';
import { getConversations, getMessages, sendMessage as sendMsg, markConversationRead } from '../api/chat';
import type { ConversationVO, MessageVO } from '../api/chat';
import { assetUrl, WS_ENDPOINT } from '../config';

export default function Chat() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetUserId = Number(searchParams.get('to')) || null;
  const targetName = searchParams.get('name');
  const [conversations, setConversations] = useState<ConversationVO[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(searchParams.get('conv'));
  const [messages, setMessages] = useState<MessageVO[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const selectedConvRef = useRef<string | null>(null);

  const loadConversations = useCallback(async () => {
    try { setConversations(await getConversations()); } catch { /* ignore */ }
  }, []);

  // Fetch messages with abort controller to prevent race conditions
  useEffect(() => {
    if (!selectedConv) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    getMessages(selectedConv)
      .then(data => {
        if (!controller.signal.aborted) {
          setMessages(data?.records || []);
          markConversationRead(selectedConv).then(loadConversations).catch(() => {});
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setMessages([]);
      });
    return () => controller.abort();
  }, [selectedConv]);

  useEffect(() => {
    selectedConvRef.current = selectedConv;
  }, [selectedConv]);

  // WebSocket connection with auth headers
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_ENDPOINT),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        client.subscribe('/user/queue/messages', (msg) => {
          try {
            const m: MessageVO = JSON.parse(msg.body);
            setMessages(prev => {
              if (m.conversationId !== selectedConvRef.current) return prev;
              if (prev.some(x => x.id === m.id)) return prev;
              return [...prev, m];
            });
            if (m.conversationId === selectedConvRef.current) {
              markConversationRead(m.conversationId).then(loadConversations).catch(() => {});
            }
            loadConversations();
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          } catch { /* ignore malformed messages */ }
        });
      },
      reconnectDelay: 5000,
    });
    client.activate();
    return () => {
      client.deactivate();
    };
    // 依赖 user?.id 而非 user 引用：资料更新（user 引用变化）不再重建连接、清空对话
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loadConversations]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadConversations().then(() => setLoading(false));
  }, [user, loadConversations]);

  const handleSend = async () => {
    if (!input.trim() || !selectedConv) return;
    const conv = conversations.find(c => c.conversationId === selectedConv);
    const receiverId = conv?.otherUserId ?? targetUserId;
    if (!receiverId) return;
    try {
      const sent = await sendMsg(selectedConv, receiverId, input.trim());
      setMessages(prev => prev.some(m => m.id === sent.id) ? prev : [...prev, sent]);
      setInput('');
      loadConversations();
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      setSendError('发送失败，请重试');
    }
  };

  const displayConversations = useMemo(() => {
    if (!selectedConv || !targetUserId || !targetName) return conversations;
    if (conversations.some(c => c.conversationId === selectedConv)) return conversations;
    const temp: ConversationVO = {
      conversationId: selectedConv,
      otherUserId: targetUserId,
      otherUserName: decodeURIComponent(targetName),
      otherUserAvatar: undefined,
      lastMessage: '',
      lastMessageTime: '',
      unreadCount: 0,
    };
    return [temp, ...conversations];
  }, [conversations, selectedConv, targetUserId, targetName]);

  const selectedUser = displayConversations.find(c => c.conversationId === selectedConv);

  if (!user) return <Alert severity="warning">请先登录</Alert>;

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 140px)', gap: 2 }}>
      <Paper sx={{ width: 320, flexShrink: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ p: 2, pb: 1 }}>对话列表</Typography>
        <Divider />
        {loading ? (
          <CircularProgress sx={{ m: 3, alignSelf: 'center' }} />
        ) : (
          <List sx={{ flex: 1, overflow: 'auto' }}>
            {displayConversations.length === 0 ? (
              <Typography sx={{ p: 3, color: 'text.secondary', textAlign: 'center' }}>
                暂无对话
              </Typography>
            ) : displayConversations.map(c => (
              <ListItemButton key={c.conversationId}
                selected={selectedConv === c.conversationId}
                onClick={() => setSelectedConv(c.conversationId)}
              >
                <ListItemAvatar>
                  <Badge color="error" variant="dot" invisible={c.unreadCount === 0}>
                    <Avatar src={assetUrl(c.otherUserAvatar || '') || undefined}>
                      {c.otherUserName?.charAt(0) || '?'}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={c.otherUserName}
                  secondary={c.lastMessage?.length > 35
                    ? c.lastMessage.substring(0, 35) + '...'
                    : c.lastMessage}
                  slotProps={{ secondary: { noWrap: true, sx: { fontSize: '0.8rem' } } }}
                />
                {c.unreadCount > 0 && (
                  <Badge badgeContent={c.unreadCount} color="error" sx={{ ml: 1 }} />
                )}
              </ListItemButton>
            ))}
          </List>
        )}
      </Paper>

      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedConv ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">选择一个对话开始聊天</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">
                {selectedUser ? (
                  <Link to={`/users/${selectedUser.otherUserId}`} style={{ color: 'inherit', textDecoration: 'none' }} title="查看用户主页">
                    {selectedUser.otherUserName}
                  </Link>
                ) : '新对话'}
              </Typography>
            </Box>
            <Box sx={{
              flex: 1, overflow: 'auto', p: 2,
              display: 'flex', flexDirection: 'column', gap: 1,
              bgcolor: 'grey.50'
            }}>
              {messages.map(m => (
                <Box key={m.id} sx={{
                  alignSelf: m.senderId === user?.id ? 'flex-end' : 'flex-start',
                  maxWidth: '70%',
                  bgcolor: m.senderId === user?.id ? 'primary.main' : '#fff',
                  color: m.senderId === user?.id ? '#fff' : 'text.primary',
                  borderRadius: 2, px: 2, py: 1,
                  boxShadow: m.senderId !== user?.id ? 1 : 0,
                }}>
                  <Typography variant="body2">{m.content}</Typography>
                  <Typography variant="caption" sx={{
                    color: m.senderId === user?.id ? 'rgba(255,255,255,0.7)' : 'text.disabled',
                    display: 'block', textAlign: 'right', mt: 0.5
                  }}>
                    {new Date(m.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Box>
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
              <TextField fullWidth size="small" placeholder="输入消息..."
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
              <Button variant="contained" endIcon={<SendIcon />} onClick={handleSend}>发送</Button>
            </Box>
          </>
        )}
      </Paper>
      <Snackbar open={!!sendError} autoHideDuration={3000} onClose={() => setSendError('')} message={sendError} />
    </Box>
  );
}
