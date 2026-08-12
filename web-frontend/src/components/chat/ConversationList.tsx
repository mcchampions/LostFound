import {
  Avatar, Badge, CircularProgress, Divider, List, ListItemAvatar, ListItemButton,
  ListItemText, Paper, Typography,
} from '@mui/material';
import type { ConversationVO } from '../../api/chat';
import { assetUrl } from '../../config';
import { useTranslation } from 'react-i18next';

interface ConversationListProps {
  conversations: ConversationVO[];
  selected: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
}

export default function ConversationList({ conversations, selected, loading, onSelect }: ConversationListProps) {
  const { t } = useTranslation();
  return <Paper sx={{ width: 320, flexShrink: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
    <Typography variant="h6" sx={{ p: 2, pb: 1 }}>{t('chat.conversationList')}</Typography><Divider />
    {loading ? <CircularProgress sx={{ m: 3, alignSelf: 'center' }} /> : <List sx={{ flex: 1, overflow: 'auto' }}>
      {conversations.length === 0 ? <Typography sx={{ p: 3, color: 'text.secondary', textAlign: 'center' }}>{t('chat.noConversations')}</Typography>
        : conversations.map(conversation => <ListItemButton key={conversation.conversationId}
          selected={selected === conversation.conversationId} onClick={() => onSelect(conversation.conversationId)}>
          <ListItemAvatar><Badge color="error" variant="dot" invisible={conversation.unreadCount === 0}>
            <Avatar src={assetUrl(conversation.otherUserAvatar || '') || undefined}>{conversation.otherUserName?.charAt(0) || '?'}</Avatar>
          </Badge></ListItemAvatar>
          <ListItemText primary={conversation.otherUserName}
            secondary={conversation.lastMessage?.length > 35 ? `${conversation.lastMessage.substring(0, 35)}...` : conversation.lastMessage}
            slotProps={{ secondary: { noWrap: true, sx: { fontSize: '0.8rem' } } }} />
          {conversation.unreadCount > 0 && <Badge badgeContent={conversation.unreadCount} color="error" sx={{ ml: 1 }} />}
        </ListItemButton>)}
    </List>}
  </Paper>;
}
