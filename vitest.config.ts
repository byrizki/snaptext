import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['**/*.{test,spec}.{ts,tsx}'],
    retry: 3,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
