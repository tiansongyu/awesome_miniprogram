import { View, Text, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { request } from '../../utils/request';
import './index.scss';

const STATUS_MAP: Record<string, { label: string; bgColor: string; textColor: string; desc: string }> = {
  PENDING:   { label: '待支付',  bgColor: '#ff9500', textColor: '#fff', desc: '请尽快完成支付' },
  PAID:      { label: '已支付',  bgColor: '#007aff', textColor: '#fff', desc: '商家正在处理中' },
  SHIPPED:   { label: '已发货',  bgColor: '#00bcd4', textColor: '#fff', desc: '商品已发出，请注意查收' },
  COMPLETED: { label: '已完成',  bgColor: '#4caf50', textColor: '#fff', desc: '交易已完成' },
  CANCELLED: { label: '已取消',  bgColor: '#999999', textColor: '#fff', desc: '订单已取消' },
};

interface OrderItem {
  skuName: string;
  specs: Record<string, string> | string;
  quantity: number;
  unitPrice: number;
  image?: string;
}

interface Settlement {
  id: string;
  profit: number;
  settledAt?: string;
  status?: string;
}

interface RefundInfo {
  id: string;
  reason: string;
  amount: number;
  status: string;
  remark?: string;
  createdAt: string;
}

const REFUND_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING:   { label: '退款审核中', color: '#ff9500' },
  APPROVED:  { label: '退款已同意', color: '#007aff' },
  REJECTED:  { label: '退款已拒绝', color: '#ff3b30' },
  COMPLETED: { label: '退款已完成', color: '#4caf50' },
};

interface OrderDetailData {
  id: string;
  orderNo: string;
  totalAmount: number;
  shippingFee?: number;
  discount?: number;
  status: string;
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  completedAt?: string;
  items: OrderItem[];
  settlements: Settlement[];
  refunds?: RefundInfo[];
  addressName?: string;
  addressPhone?: string;
  addressDetail?: string;
  expressCompany?: string;
  expressNo?: string;
}

export default function OrderDetail() {
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(false);

  const { id } = Taro.getCurrentInstance().router?.params || {};

  const fetchOrder = () => {
    if (!id) return;
    setLoading(true);
    request<OrderDetailData>({ url: `/orders/${id}` })
      .then(res => setOrder(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useDidShow(() => {
    fetchOrder();
  });

  const formatDate = (iso: string) => {
    try {
      return iso.replace('T', ' ').slice(0, 19);
    } catch (_) {
      return iso;
    }
  };

  const handleCancelOrder = () => {
    Taro.showModal({
      title: '提示',
      content: '确定要取消该订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await request({ url: `/orders/${id}/cancel`, method: 'POST' });
            Taro.showToast({ title: '已取消', icon: 'success' });
            fetchOrder();
          } catch (_) {
            Taro.showToast({ title: '取消失败', icon: 'none' });
          }
        }
      },
    });
  };

  const handlePay = () => {
    Taro.showToast({ title: '正在发起支付...', icon: 'loading' });
    request({ url: `/orders/${id}/pay`, method: 'POST' })
      .then(() => {
        Taro.showToast({ title: '支付成功', icon: 'success' });
        fetchOrder();
      })
      .catch(() => {
        Taro.showToast({ title: '支付失败', icon: 'none' });
      });
  };

  const handleConfirmReceive = () => {
    Taro.showModal({
      title: '提示',
      content: '确认已收到商品？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await request({ url: `/orders/${id}/confirm`, method: 'POST' });
            Taro.showToast({ title: '已确认收货', icon: 'success' });
            fetchOrder();
          } catch (_) {
            Taro.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      },
    });
  };

  if (loading) {
    return (
      <View className="order-detail order-detail--loading">
        <Text className="order-detail__loading-text">加载中...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View className="order-detail order-detail--empty">
        <Text className="order-detail__empty-text">订单不存在</Text>
      </View>
    );
  }

  const si = STATUS_MAP[order.status] || { label: order.status, bgColor: '#999', textColor: '#fff', desc: '' };
  const totalProfit = order.settlements.reduce((sum, s) => sum + Number(s.profit || 0), 0);
  const itemsTotal = order.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
  const shippingFee = Number(order.shippingFee || 0);
  const discount = Number(order.discount || 0);

  return (
    <View className="order-detail">
      {/* Status banner */}
      <View className="order-detail__banner" style={{ background: `linear-gradient(135deg, ${si.bgColor}, ${si.bgColor}cc)` }}>
        <Text className="order-detail__banner-status" style={{ color: si.textColor }}>{si.label}</Text>
        <Text className="order-detail__banner-desc" style={{ color: si.textColor }}>{si.desc}</Text>
      </View>

      {/* Address info */}
      {order.addressName && (
        <View className="order-detail__section order-detail__address-section">
          <View className="order-detail__address-row">
            <Text className="order-detail__address-icon">📍</Text>
            <View className="order-detail__address-content">
              <View className="order-detail__address-top">
                <Text className="order-detail__address-name">{order.addressName}</Text>
                <Text className="order-detail__address-phone">{order.addressPhone}</Text>
              </View>
              <Text className="order-detail__address-detail">{order.addressDetail}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Logistics info */}
      {(order.status === 'SHIPPED' || order.status === 'COMPLETED') && order.expressNo && (
        <View className="order-detail__section">
          <Text className="order-detail__section-title">物流信息</Text>
          <View className="order-detail__logistics">
            <View className="order-detail__logistics-icon">🚚</View>
            <View className="order-detail__logistics-content">
              <View className="order-detail__row">
                <Text className="order-detail__label">快递公司</Text>
                <Text className="order-detail__value">{order.expressCompany || '未知'}</Text>
              </View>
              <View className="order-detail__row">
                <Text className="order-detail__label">快递单号</Text>
                <Text
                  className="order-detail__value order-detail__value--copy"
                  onClick={() => {
                    Taro.setClipboardData({
                      data: order.expressNo!,
                      success: () => Taro.showToast({ title: '已复制单号', icon: 'success' }),
                    });
                  }}
                >
                  {order.expressNo} 复制
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Items */}
      <View className="order-detail__section">
        <Text className="order-detail__section-title">商品明细</Text>
        {order.items.map((item, idx) => (
          <View key={idx} className="order-detail__item">
            {item.image ? (
              <Image className="order-detail__item-image" src={item.image} mode="aspectFill" />
            ) : (
              <View className="order-detail__item-placeholder">
                <Text className="order-detail__item-placeholder-text">📦</Text>
              </View>
            )}
            <View className="order-detail__item-info">
              <Text className="order-detail__item-name">{item.skuName}</Text>
              {item.specs ? <Text className="order-detail__item-specs">{typeof item.specs === 'string' ? item.specs : Object.values(item.specs).join(' / ')}</Text> : null}
            </View>
            <View className="order-detail__item-right">
              <Text className="order-detail__item-price">¥{Number(item.unitPrice).toFixed(2)}</Text>
              <Text className="order-detail__item-qty">x{item.quantity}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Price details */}
      <View className="order-detail__section">
        <Text className="order-detail__section-title">价格明细</Text>
        <View className="order-detail__row">
          <Text className="order-detail__label">商品总价</Text>
          <Text className="order-detail__value">¥{itemsTotal.toFixed(2)}</Text>
        </View>
        <View className="order-detail__row">
          <Text className="order-detail__label">运费</Text>
          <Text className="order-detail__value">{shippingFee > 0 ? `¥${shippingFee.toFixed(2)}` : '免运费'}</Text>
        </View>
        {discount > 0 && (
          <View className="order-detail__row">
            <Text className="order-detail__label">优惠</Text>
            <Text className="order-detail__value order-detail__value--discount">-¥{discount.toFixed(2)}</Text>
          </View>
        )}
        <View className="order-detail__row order-detail__row--total">
          <Text className="order-detail__label">实付金额</Text>
          <Text className="order-detail__value order-detail__value--total">¥{Number(order.totalAmount).toFixed(2)}</Text>
        </View>
      </View>

      {/* Order info */}
      <View className="order-detail__section">
        <Text className="order-detail__section-title">订单信息</Text>
        <View className="order-detail__row">
          <Text className="order-detail__label">订单编号</Text>
          <Text className="order-detail__value">{order.orderNo}</Text>
        </View>
        <View className="order-detail__row">
          <Text className="order-detail__label">下单时间</Text>
          <Text className="order-detail__value">{formatDate(order.createdAt)}</Text>
        </View>
        {order.paidAt && (
          <View className="order-detail__row">
            <Text className="order-detail__label">支付时间</Text>
            <Text className="order-detail__value">{formatDate(order.paidAt)}</Text>
          </View>
        )}
        {order.shippedAt && (
          <View className="order-detail__row">
            <Text className="order-detail__label">发货时间</Text>
            <Text className="order-detail__value">{formatDate(order.shippedAt)}</Text>
          </View>
        )}
        {order.completedAt && (
          <View className="order-detail__row">
            <Text className="order-detail__label">完成时间</Text>
            <Text className="order-detail__value">{formatDate(order.completedAt)}</Text>
          </View>
        )}
      </View>

      {/* Settlement info */}
      {order.settlements.length > 0 && (
        <View className="order-detail__section">
          <Text className="order-detail__section-title">结算信息</Text>
          {order.settlements.map((s, idx) => (
            <View key={idx} className="order-detail__settlement">
              <View className="order-detail__row">
                <Text className="order-detail__label">结算利润</Text>
                <Text className="order-detail__value order-detail__value--profit">¥{(s.profit || 0).toFixed(2)}</Text>
              </View>
              {s.settledAt && (
                <View className="order-detail__row">
                  <Text className="order-detail__label">结算时间</Text>
                  <Text className="order-detail__value">{formatDate(s.settledAt)}</Text>
                </View>
              )}
              {s.status && (
                <View className="order-detail__row">
                  <Text className="order-detail__label">结算状态</Text>
                  <Text className="order-detail__value">{s.status}</Text>
                </View>
              )}
            </View>
          ))}
          {order.settlements.length > 1 && (
            <View className="order-detail__row order-detail__row--total">
              <Text className="order-detail__label">总利润</Text>
              <Text className="order-detail__value order-detail__value--profit">¥{totalProfit.toFixed(2)}</Text>
            </View>
          )}
        </View>
      )}

      {/* Action buttons */}
      {(order.status === 'PENDING' || order.status === 'SHIPPED' || order.status === 'PAID') && (
        <View className="order-detail__actions">
          {order.status === 'PENDING' && (
            <>
              <View className="order-detail__btn order-detail__btn--default" onClick={handleCancelOrder}>
                <Text className="order-detail__btn-text order-detail__btn-text--default">取消订单</Text>
              </View>
              <View className="order-detail__btn order-detail__btn--primary" onClick={handlePay}>
                <Text className="order-detail__btn-text order-detail__btn-text--primary">立即支付</Text>
              </View>
            </>
          )}
          {order.status === 'PAID' && (
            <View
              className="order-detail__btn order-detail__btn--warning"
              onClick={() => {
                Taro.navigateTo({ url: `/pages/refund/index?orderId=${order.id}&amount=${order.totalAmount}` });
              }}
            >
              <Text className="order-detail__btn-text order-detail__btn-text--warning">申请退款</Text>
            </View>
          )}
          {order.status === 'SHIPPED' && (
            <>
              <View
                className="order-detail__btn order-detail__btn--warning"
                onClick={() => {
                  Taro.navigateTo({ url: `/pages/refund/index?orderId=${order.id}&amount=${order.totalAmount}` });
                }}
              >
                <Text className="order-detail__btn-text order-detail__btn-text--warning">申请退款</Text>
              </View>
              <View className="order-detail__btn order-detail__btn--primary" onClick={handleConfirmReceive}>
                <Text className="order-detail__btn-text order-detail__btn-text--primary">确认收货</Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Refund status */}
      {order.refunds && order.refunds.length > 0 && (
        <View className="order-detail__section">
          <Text className="order-detail__section-title">退款信息</Text>
          {order.refunds.map((refund) => {
            const rs = REFUND_STATUS_MAP[refund.status] || { label: refund.status, color: '#999' };
            return (
              <View key={refund.id} className="order-detail__refund-item">
                <View className="order-detail__refund-row">
                  <Text className="order-detail__refund-label">退款状态</Text>
                  <Text className="order-detail__refund-status" style={{ color: rs.color }}>{rs.label}</Text>
                </View>
                <View className="order-detail__refund-row">
                  <Text className="order-detail__refund-label">退款金额</Text>
                  <Text className="order-detail__refund-amount">¥{refund.amount}</Text>
                </View>
                <View className="order-detail__refund-row">
                  <Text className="order-detail__refund-label">退款原因</Text>
                  <Text className="order-detail__refund-reason">{refund.reason}</Text>
                </View>
                {refund.remark && (
                  <View className="order-detail__refund-row">
                    <Text className="order-detail__refund-label">管理员备注</Text>
                    <Text className="order-detail__refund-reason">{refund.remark}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Review button for completed orders */}
      {order.status === 'COMPLETED' && (
        <View className="order-detail__actions">
          <View
            className="order-detail__btn order-detail__btn--primary"
            onClick={() => {
              Taro.navigateTo({ url: `/pages/review/index?orderId=${order.id}` });
            }}
          >
            <Text className="order-detail__btn-text order-detail__btn-text--primary">去评价</Text>
          </View>
        </View>
      )}
    </View>
  );
}
