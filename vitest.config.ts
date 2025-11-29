import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    bail: 0,
    env: {
      DATABASE_URL: 'postgresql://postgres:password@localhost:5432/crowdiant_dev',
    },
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
    },
  },
});
