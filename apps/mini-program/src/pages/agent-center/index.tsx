import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { request } from '../../utils/request';
import { useAuthStore } from '../../store/auth';
import './index.scss';

interface Stats {
  total: number;
  today: number;
  thisMonth: number;
}

interface Agent {
  id: string;
  nickname: string;
  role: string;
  isFrozen: boolean;
}

const ROLE_LABEL_MAP: Record<string, string> = {
  AGENT_L1: '一级代理',
  AGENT_L2: '二级代理',
  AGENT_L3: '三级代理',
};

export default function AgentCenter() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({ total: 0, today: 0, thisMonth: 0 });
  const [bindCode, setBindCode] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);

  useDidShow(() => {
    fetchData();
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, codeRes, agentsRes] = await Promise.all([
        request<Stats>({ url: '/settlements/stats' }),
        request<{ bindCode: string }>({ url: '/qrcode/my-code' }),
        request<{ items: Agent[]; total: number }>({
          url: '/agents',
          data: { page: 1, pageSize: 50 },
        }),
      ]);
      setStats(statsRes);
      setBindCode(codeRes.bindCode);
      setAgents(agentsRes.items || []);
    } catch (e) {
      // errors are shown by request util via Taro.showToast
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    Taro.setClipboardData({ data: bindCode });
  };

  const roleLabel = user?.role ? (ROLE_LABEL_MAP[user.role] ?? user.role) : '';

  return (
    <View className="agent-center">
      {/* Identity banner */}
      <View className="agent-center__banner">
        <Text className="agent-center__banner-name">{user?.nickname ?? '代理'}</Text>
        {roleLabel ? (
          <Text className="agent-center__banner-role">{roleLabel}</Text>
        ) : null}
      </View>

      {/* Earnings stats */}
      <View className="agent-center__stats">
        <View className="agent-center__stat-card">
          <Text className="agent-center__stat-value">¥{stats.total.toFixed(2)}</Text>
          <Text className="agent-center__stat-label">累计收益</Text>
        </View>
        <View className="agent-center__stat-card">
          <Text className="agent-center__stat-value">¥{stats.today.toFixed(2)}</Text>
          <Text className="agent-center__stat-label">今日收益</Text>
        </View>
        <View className="agent-center__stat-card">
          <Text className="agent-center__stat-value">¥{stats.thisMonth.toFixed(2)}</Text>
          <Text className="agent-center__stat-label">本月收益</Text>
        </View>
      </View>

      {/* Bind code */}
      <View className="agent-center__section">
        <Text className="agent-center__section-title">我的邀请码</Text>
        <View className="agent-center__code-box">
          <Text className="agent-center__code-text">{bindCode || '--'}</Text>
          <View className="agent-center__copy-btn" onClick={copyCode}>
            <Text className="agent-center__copy-text">复制</Text>
          </View>
        </View>
      </View>

      {/* Sub-agents list */}
      <View className="agent-center__section">
        <View className="agent-center__section-header">
          <Text className="agent-center__section-title">我的下级</Text>
          <Text className="agent-center__section-count">{agents.length} 人</Text>
        </View>

        {loading ? (
          <View className="agent-center__loading">
            <Text>加载中...</Text>
          </View>
        ) : agents.length === 0 ? (
          <View className="agent-center__empty">
            <Text className="agent-center__empty-text">暂无下级代理</Text>
          </View>
        ) : (
          agents.map((agent) => (
            <View key={agent.id} className="agent-center__agent-card">
              <View className="agent-center__agent-info">
                <Text className="agent-center__agent-name">{agent.nickname}</Text>
                <Text className="agent-center__agent-role">
                  {ROLE_LABEL_MAP[agent.role] ?? agent.role}
                </Text>
              </View>
              {agent.isFrozen && (
                <Text className="agent-center__frozen-tag">已冻结</Text>
              )}
            </View>
          ))
        )}
      </View>
    </View>
  );
}
