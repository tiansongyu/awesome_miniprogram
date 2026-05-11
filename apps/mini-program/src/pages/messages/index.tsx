import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { request } from '../../utils/request';
import './index.scss';

interface Message {
  id: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  SYSTEM: '系统通知',
  ORDER: '订单通知',
  PROMOTION: '促销通知',
  SETTLEMENT: '结算通知',
};

export default function Messages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useDidShow(() => {
    fetchMessages(1);
    fetchUnreadCount();
  });

  const fetchMessages = async (p: number) => {
    setLoading(true);
    try {
      const res = await request<{ items: Message[]; total: number }>({
        url: '/messages',
        data: { page: p, pageSize: 20 },
      });
      if (p === 1) {
        setMessages(res.items);
      } else {
        setMessages((prev) => [...prev, ...res.items]);
      }
      setTotal(res.total);
      setPage(p);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await request<{ count: number }>({
        url: '/messages/unread-count',
      });
      setUnreadCount(res.count);
    } catch (e) {
      // ignore
    }
  };

  const handleRead = async (msg: Message) => {
    if (!msg.isRead) {
      await request({ url: `/messages/${msg.id}/read`, method: 'PUT' });
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    Taro.showModal({
      title: msg.title,
      content: msg.content,
      showCancel: false,
      confirmText: '知道了',
    });
  };

  const handleReadAll = async () => {
    if (unreadCount === 0) {
      Taro.showToast({ title: '没有未读消息', icon: 'none' });
      return;
    }
    await request({ url: '/messages/read-all', method: 'PUT' });
    setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
    setUnreadCount(0);
    Taro.showToast({ title: '已全部标记已读', icon: 'success' });
  };

  const loadMore = () => {
    if (messages.length < total && !loading) {
      fetchMessages(page + 1);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hour}:${min}`;
  };

  return (
    <View className="messages">
      <View className="messages__header">
        <View className="messages__unread-info">
          <Text className="messages__unread-text">
            未读消息：{unreadCount} 条
          </Text>
        </View>
        <View className="messages__read-all" onClick={handleReadAll}>
          <Text className="messages__read-all-text">全部已读</Text>
        </View>
      </View>

      <View className="messages__list">
        {messages.length === 0 && !loading && (
          <View className="messages__empty">
            <Text className="messages__empty-text">暂无消息</Text>
          </View>
        )}
        {messages.map((msg) => (
          <View
            key={msg.id}
            className={`messages__item ${!msg.isRead ? 'messages__item--unread' : ''}`}
            onClick={() => handleRead(msg)}
          >
            <View className="messages__item-header">
              <View className="messages__item-left">
                {!msg.isRead && <View className="messages__dot" />}
                <Text className="messages__item-type">
                  {TYPE_LABEL[msg.type] || '通知'}
                </Text>
              </View>
              <Text className="messages__item-time">
                {formatTime(msg.createdAt)}
              </Text>
            </View>
            <Text className="messages__item-title">{msg.title}</Text>
            <Text className="messages__item-content">{msg.content}</Text>
          </View>
        ))}
        {messages.length < total && (
          <View className="messages__load-more" onClick={loadMore}>
            <Text className="messages__load-more-text">
              {loading ? '加载中...' : '加载更多'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
