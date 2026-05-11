import { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { request } from '../../utils/request';
import './index.scss';

interface PointLog {
  id: string;
  description: string;
  points: number;
  createdAt: string;
}

interface PointsLogResponse {
  items: PointLog[];
  total: number;
}

export default function PointsPage() {
  const [totalPoints, setTotalPoints] = useState(0);
  const [logs, setLogs] = useState<PointLog[]>([]);
  const [signed, setSigned] = useState(false);

  const fetchPointsLog = async () => {
    try {
      const res = await request<PointsLogResponse>({
        url: '/sign-in/points-log?page=1&pageSize=20',
      });
      setLogs(res.items || []);
      const total = (res.items || []).reduce((sum, item) => sum + item.points, 0);
      setTotalPoints(total);
    } catch (e) {
      // ignore
    }
  };

  const handleSignIn = async () => {
    try {
      await request({ url: '/sign-in', method: 'POST' });
      setSigned(true);
      Taro.showToast({ title: '签到成功', icon: 'success' });
      fetchPointsLog();
    } catch (e) {
      Taro.showToast({ title: '签到失败', icon: 'none' });
    }
  };

  useEffect(() => {
    fetchPointsLog();
  }, []);

  const formatTime = (time: string) => {
    const d = new Date(time);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <View className="points-page">
      <View className="points-card">
        <Text className="points-label">我的积分</Text>
        <Text className="points-value">{totalPoints}</Text>
        <View
          className={`sign-btn ${signed ? 'signed' : ''}`}
          onClick={!signed ? handleSignIn : undefined}
        >
          <Text className="sign-btn-text">{signed ? '已签到' : '签到'}</Text>
        </View>
      </View>

      <View className="points-history">
        <Text className="section-title">积分记录</Text>
        {logs.length === 0 && (
          <View className="empty-tip">
            <Text>暂无积分记录</Text>
          </View>
        )}
        {logs.map((item) => (
          <View className="log-item" key={item.id}>
            <View className="log-left">
              <Text className="log-desc">{item.description}</Text>
              <Text className="log-time">{formatTime(item.createdAt)}</Text>
            </View>
            <Text className={`log-points ${item.points > 0 ? 'positive' : 'negative'}`}>
              {item.points > 0 ? `+${item.points}` : item.points}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
