import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    alias: {
      '@tarojs/taro': path.resolve(__dirname, './src/test/mocks/taro.ts'),
      '@tarojs/components': path.resolve(__dirname, './src/test/mocks/taro-components.tsx'),
    },
  },
});
