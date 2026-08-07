import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MessagePanel from './MessagePanel';

describe('MessagePanel', () => {
  it('将旁白消息显示为居中文字而不是聊天气泡', () => {
    render(<MessagePanel
      userId={1}
      conversation={{
        conversationId: '1_2', otherUserId: 2, otherUserName: '用户二',
        lastMessage: '', lastMessageTime: '', unreadCount: 0,
      }}
      messages={[{
        id: 1, conversationId: '1_2', senderId: 1, senderName: '用户一', receiverId: 2,
        content: '认领申请已通过，现在可以开始对话了。', messageType: 'NARRATION',
        isRead: false, createdAt: '2026-08-07T10:00:00',
      }]}
      input=""
      hasMore={false}
      loadingMore={false}
      onInputChange={vi.fn()}
      onLoadEarlier={vi.fn()}
      onSend={vi.fn()}
      endRef={{ current: null }}
    />);

    expect(screen.getByText('认领申请已通过，现在可以开始对话了。')).toBeInTheDocument();
    expect(screen.queryByText('10:00')).not.toBeInTheDocument();
  });
});
