import { describe, it, expect, beforeEach } from 'vitest';
import { getSettlements, getSettlementStats, getSettlement, updateSettlement } from '../api/settlements';

describe('Settlements API', () => {
  beforeEach(() => {
    localStorage.setItem('accessToken', 'mock-token');
  });

  it('getSettlements should return list', async () => {
    const result = await getSettlements();
    expect(result).toBeDefined();
  });

  it('getSettlements with params should succeed', async () => {
    const result = await getSettlements({ page: 1, pageSize: 10 });
    expect(result).toBeDefined();
  });

  it('getSettlementStats should return statistics', async () => {
    const result = await getSettlementStats();
    expect(result).toBeDefined();
  });

  it('getSettlement should return single settlement', async () => {
    const result = await getSettlement(1);
    expect(result).toBeDefined();
  });

  it('updateSettlement should return updated data', async () => {
    const result = await updateSettlement(1, { status: 'SETTLED' });
    expect(result).toBeDefined();
  });
});
