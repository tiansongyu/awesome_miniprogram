import { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import { useAuthStore } from '../../store/auth';
import { request } from '../../utils/request';
import './index.scss';

interface Settlement {
  id: string;
  amount: string;
  status: 'PENDING' | 'COMPLETED';
  createdAt: string;
}

interface SettlementResponse {
  items: Settlement[];
  total: number;
}

export default function BalancePage() {
  const { user } = useAuthStore();
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  const fetchSettlements = async () => {
    try {
      const res = await request<SettlementResponse>({
        url: '/settlements/my?page=1&pageSize=20',
      });
      setSettlements(res.items || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const formatTime = (time: string) => {
    const d = new Date(time);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '待结算';
      case 'COMPLETED':
        return '已完成';
      default:
        return status;
    }
  };

  return (
    <View className="balance-page">
      <View className="balance-card">
        <Text className="balance-label">当前余额</Text>
        <View style={{ display: 'flex', alignItems: 'baseline' }}>
          <Text className="balance-value">
            {parseFloat(user?.balance || '0').toFixed(2)}
          </Text>
          <Text className="balance-unit">元</Text>
        </View>
      </View>

      <View className="settlement-list">
        <Text className="section-title">结算记录</Text>
        {settlements.length === 0 && (
          <View className="empty-tip">
            <Text>暂无结算记录</Text>
          </View>
        )}
        {settlements.map((item) => (
          <View className="settlement-item" key={item.id}>
            <View className="settlement-left">
              <Text className="settlement-amount">¥{parseFloat(item.amount).toFixed(2)}</Text>
              <Text className="settlement-time">{formatTime(item.createdAt)}</Text>
            </View>
            <Text className={`settlement-status ${item.status.toLowerCase()}`}>
              {getStatusText(item.status)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
