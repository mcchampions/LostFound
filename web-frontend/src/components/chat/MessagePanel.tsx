import { Box, Button, Link, Paper, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import type { ConversationVO, MessageVO } from '../../api/chat';

interface MessagePanelProps {
  userId: number;
  conversation: ConversationVO | undefined;
  messages: MessageVO[];
  input: string;
  hasMore: boolean;
  loadingMore: boolean;
  onInputChange: (value: string) => void;
  onLoadEarlier: () => void;
  onSend: () => void;
  endRef: React.RefObject<HTMLDivElement | null>;
}

export default function MessagePanel({ userId, conversation, messages, input, hasMore, loadingMore,
  onInputChange, onLoadEarlier, onSend, endRef }: MessagePanelProps) {
  return <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    {!conversation ? <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography color="text.secondary">选择一个对话开始聊天</Typography>
    </Box> : <>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}><Typography variant="h6">
        <Link href={`/users/${conversation.otherUserId}`} color="inherit" underline="none" title="查看用户主页">{conversation.otherUserName}</Link>
      </Typography></Box>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'grey.50' }}>
        {hasMore && <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Typography component="span" role="button" tabIndex={0}
            onClick={() => { if (!loadingMore) onLoadEarlier(); }}
            onKeyDown={event => { if ((event.key === 'Enter' || event.key === ' ') && !loadingMore) onLoadEarlier(); }}
            sx={{ color: 'primary.main', cursor: loadingMore ? 'wait' : 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            {loadingMore ? '正在加载之前五十条消息…' : '查看之前五十条消息'}
          </Typography>
        </Box>}
        {messages.map(message => message.messageType === 'NARRATION' ? (
          <Box key={message.id} sx={{ alignSelf: 'center', px: 2, py: 0.5, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">{message.content}</Typography>
          </Box>
        ) : (
          <Box key={message.id} sx={{ alignSelf: message.senderId === userId ? 'flex-end' : 'flex-start', maxWidth: '70%', bgcolor: message.senderId === userId ? 'primary.main' : '#fff', color: message.senderId === userId ? '#fff' : 'text.primary', borderRadius: 2, px: 2, py: 1, boxShadow: message.senderId !== userId ? 1 : 0 }}>
            <Typography variant="body2">{message.content}</Typography>
            <Typography variant="caption" sx={{ color: message.senderId === userId ? 'rgba(255,255,255,0.7)' : 'text.disabled', display: 'block', textAlign: 'right', mt: 0.5 }}>{new Date(message.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</Typography>
          </Box>
        ))}
        <div ref={endRef} />
      </Box>
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
        <TextField fullWidth size="small" placeholder="输入消息..." value={input}
          onChange={event => onInputChange(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSend(); } }}
          slotProps={{ input: { sx: { borderRadius: 2 } } }} />
        <Button variant="contained" endIcon={<SendIcon />} onClick={onSend}>发送</Button>
      </Box>
    </>}
  </Paper>;
}
