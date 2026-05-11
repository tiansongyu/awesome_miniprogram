import { View, Text, Input, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState, useEffect } from 'react';
import { request } from '../../utils/request';
import './index.scss';

interface Address {
  id: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

export default function AddressPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    detail: '',
    isDefault: false,
  });

  const fetchAddresses = async () => {
    try {
      const data = await request<Address[]>({ url: '/addresses' });
      setAddresses(data);
    } catch (e) {
      Taro.showToast({ title: '获取地址失败', icon: 'none' });
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const resetForm = () => {
    setForm({ name: '', phone: '', province: '', city: '', district: '', detail: '', isDefault: false });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (addr: Address) => {
    setForm({
      name: addr.name,
      phone: addr.phone,
      province: addr.province,
      city: addr.city,
      district: addr.district,
      detail: addr.detail,
      isDefault: addr.isDefault,
    });
    setEditingId(addr.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.province || !form.city || !form.district || !form.detail) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    try {
      if (editingId) {
        await request({ url: `/addresses/${editingId}`, method: 'PUT', data: form });
        Taro.showToast({ title: '修改成功', icon: 'success' });
      } else {
        await request({ url: '/addresses', method: 'POST', data: form });
        Taro.showToast({ title: '添加成功', icon: 'success' });
      }
      resetForm();
      fetchAddresses();
    } catch (e) {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
  };

  const handleDelete = (id: string) => {
    Taro.showModal({
      title: '提示',
      content: '确定删除该地址吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await request({ url: `/addresses/${id}`, method: 'DELETE' });
            Taro.showToast({ title: '删除成功', icon: 'success' });
            fetchAddresses();
          } catch (e) {
            Taro.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      },
    });
  };

  const handleSetDefault = async (id: string) => {
    try {
      await request({ url: `/addresses/${id}/default`, method: 'PUT' });
      Taro.showToast({ title: '设置成功', icon: 'success' });
      fetchAddresses();
    } catch (e) {
      Taro.showToast({ title: '设置失败', icon: 'none' });
    }
  };

  if (showForm) {
    return (
      <View className="address-form">
        <View className="address-form__title">
          <Text>{editingId ? '编辑地址' : '新增地址'}</Text>
        </View>
        <View className="address-form__item">
          <Text className="address-form__label">收货人</Text>
          <Input
            className="address-form__input"
            placeholder="请输入收货人姓名"
            value={form.name}
            onInput={(e) => setForm({ ...form, name: e.detail.value })}
          />
        </View>
        <View className="address-form__item">
          <Text className="address-form__label">手机号</Text>
          <Input
            className="address-form__input"
            type="number"
            placeholder="请输入手机号"
            maxlength={11}
            value={form.phone}
            onInput={(e) => setForm({ ...form, phone: e.detail.value })}
          />
        </View>
        <View className="address-form__item">
          <Text className="address-form__label">省份</Text>
          <Input
            className="address-form__input"
            placeholder="请输入省份"
            value={form.province}
            onInput={(e) => setForm({ ...form, province: e.detail.value })}
          />
        </View>
        <View className="address-form__item">
          <Text className="address-form__label">城市</Text>
          <Input
            className="address-form__input"
            placeholder="请输入城市"
            value={form.city}
            onInput={(e) => setForm({ ...form, city: e.detail.value })}
          />
        </View>
        <View className="address-form__item">
          <Text className="address-form__label">区/县</Text>
          <Input
            className="address-form__input"
            placeholder="请输入区/县"
            value={form.district}
            onInput={(e) => setForm({ ...form, district: e.detail.value })}
          />
        </View>
        <View className="address-form__item">
          <Text className="address-form__label">详细地址</Text>
          <Input
            className="address-form__input"
            placeholder="请输入详细地址"
            value={form.detail}
            onInput={(e) => setForm({ ...form, detail: e.detail.value })}
          />
        </View>
        <View className="address-form__item address-form__item--switch" onClick={() => setForm({ ...form, isDefault: !form.isDefault })}>
          <Text className="address-form__label">设为默认地址</Text>
          <View className={`address-form__switch ${form.isDefault ? 'address-form__switch--on' : ''}`}>
            <View className="address-form__switch-dot" />
          </View>
        </View>
        <View className="address-form__actions">
          <Button className="address-form__btn address-form__btn--cancel" onClick={resetForm}>取消</Button>
          <Button className="address-form__btn address-form__btn--submit" onClick={handleSubmit}>保存</Button>
        </View>
      </View>
    );
  }

  return (
    <View className="address">
      {addresses.length === 0 ? (
        <View className="address__empty">
          <Text>暂无收货地址</Text>
        </View>
      ) : (
        <View className="address__list">
          {addresses.map((addr) => (
            <View className="address__item" key={addr.id}>
              <View className="address__info">
                <View className="address__header">
                  <Text className="address__name">{addr.name}</Text>
                  <Text className="address__phone">{addr.phone}</Text>
                  {addr.isDefault && <Text className="address__tag">默认</Text>}
                </View>
                <Text className="address__detail">
                  {addr.province} {addr.city} {addr.district} {addr.detail}
                </Text>
              </View>
              <View className="address__actions">
                {!addr.isDefault && (
                  <Text className="address__action" onClick={() => handleSetDefault(addr.id)}>设为默认</Text>
                )}
                <Text className="address__action" onClick={() => handleEdit(addr)}>编辑</Text>
                <Text className="address__action address__action--danger" onClick={() => handleDelete(addr.id)}>删除</Text>
              </View>
            </View>
          ))}
        </View>
      )}
      <View className="address__footer">
        <Button className="address__add-btn" onClick={() => setShowForm(true)}>新增收货地址</Button>
      </View>
    </View>
  );
}
