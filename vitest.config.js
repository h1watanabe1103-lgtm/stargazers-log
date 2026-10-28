import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // VitestではReact部品テストだけを実行し、Node.jsテストと分離する。
    include: ['src/components/**/*.test.tsx'],
    environment: 'jsdom',
    globals: true,
    clearMocks: true,
  },
});
