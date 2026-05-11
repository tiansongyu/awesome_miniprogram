import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Coupons from './index';

vi.mock('../../utils/request', () => ({
  request: vi.fn(),
}));

vi.mock('./index.scss', () => ({}));

import { request } from '../../utils/request';
const mockedRequest = vi.mocked(request);

describe('Coupons page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render coupon names from the list', async () => {
    mockedRequest.mockResolvedValueOnce([
      {
        id: 'c1',
        name: '新人优惠券',
        type: 'AMOUNT',
        value: 10,
        minAmount: 50,
        startTime: '2025-01-01T00:00:00Z',
        endTime: '2025-12-31T23:59:59Z',
        status: 'ACTIVE',
        claimed: false,
      },
      {
        id: 'c2',
        name: '满减券',
        type: 'AMOUNT',
        value: 20,
        minAmount: 100,
        startTime: '2025-01-01T00:00:00Z',
        endTime: '2025-12-31T23:59:59Z',
        status: 'ACTIVE',
        claimed: false,
      },
    ]);

    await act(async () => {
      render(<Coupons />);
    });

    expect(screen.getByText('新人优惠券')).toBeInTheDocument();
    expect(screen.getByText('满减券')).toBeInTheDocument();
  });

  it('should call POST /coupons/:id/claim when clicking claim button', async () => {
    mockedRequest.mockResolvedValueOnce([
      {
        id: 'c1',
        name: '新人优惠券',
        type: 'AMOUNT',
        value: 10,
        minAmount: 50,
        startTime: '2025-01-01T00:00:00Z',
        endTime: '2025-12-31T23:59:59Z',
        status: 'ACTIVE',
        claimed: false,
      },
    ]);

    await act(async () => {
      render(<Coupons />);
    });

    // Mock the claim request
    mockedRequest.mockResolvedValueOnce(undefined);

    const claimButton = screen.getByText('领取');
    await act(async () => {
      fireEvent.click(claimButton);
    });

    await waitFor(() => {
      expect(mockedRequest).toHaveBeenCalledWith({
        url: '/coupons/c1/claim',
        method: 'POST',
      });
    });
  });
});
