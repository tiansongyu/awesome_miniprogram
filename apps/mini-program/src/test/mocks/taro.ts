const storage: Record<string, string> = {};

const Taro = {
  getStorageSync: (key: string) => storage[key] || '',
  setStorageSync: (key: string, value: string) => { storage[key] = value; },
  removeStorageSync: (key: string) => { delete storage[key]; },
  showToast: () => {},
  showModal: () => Promise.resolve({ confirm: true }),
  navigateTo: () => {},
  switchTab: () => {},
  navigateBack: () => {},
  login: () => Promise.resolve({ code: 'mock-code' }),
  request: () => Promise.resolve({ statusCode: 200, data: { code: 0, data: null, message: 'success' } }),
  useRouter: () => ({ params: {} }),
  useDidShow: (fn: () => void) => fn(),
  chooseImage: () => Promise.resolve({ tempFilePaths: [] }),
};

export default Taro;
export const useRouter = Taro.useRouter;
export const useDidShow = Taro.useDidShow;
