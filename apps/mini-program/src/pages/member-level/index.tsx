import { View, Text } from '@tarojs/components';
import { useAuthStore } from '../../store/auth';
import './index.scss';

interface LevelInfo {
  key: string;
  name: string;
  nameCn: string;
  benefits: string[];
  cardClass: string;
}

const levels: LevelInfo[] = [
  {
    key: 'BRONZE',
    name: 'BRONZE',
    nameCn: '铜卡会员',
    benefits: ['基础会员价'],
    cardClass: 'level-card-bronze',
  },
  {
    key: 'SILVER',
    name: 'SILVER',
    nameCn: '银卡会员',
    benefits: ['银卡专属价', '优先发货'],
    cardClass: 'level-card-silver',
  },
  {
    key: 'GOLD',
    name: 'GOLD',
    nameCn: '金卡会员',
    benefits: ['金卡专属价', '优先发货', '专属客服'],
    cardClass: 'level-card-gold',
  },
];

export default function MemberLevelPage() {
  const { user } = useAuthStore();
  const currentLevel = user?.memberLevel || 'BRONZE';

  const getLevelCnName = (level: string) => {
    const found = levels.find((l) => l.key === level);
    return found ? found.nameCn : '铜卡会员';
  };

  return (
    <View className="member-level-page">
      <View className="current-level">
        <Text className="current-level-label">当前等级</Text>
        <Text className="current-level-value">{getLevelCnName(currentLevel)}</Text>
      </View>

      <View className="level-cards">
        {levels.map((level) => (
          <View
            key={level.key}
            className={`level-card ${level.cardClass} ${currentLevel === level.key ? 'active' : ''}`}
          >
            {currentLevel === level.key && (
              <Text className="active-badge">当前</Text>
            )}
            <Text className="level-name">{level.name}</Text>
            <Text className="level-name-cn">{level.nameCn}</Text>
            <View className="level-benefits">
              {level.benefits.map((benefit, idx) => (
                <View className="benefit-item" key={idx}>
                  <View className="benefit-dot" />
                  <Text className="benefit-text">{benefit}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
