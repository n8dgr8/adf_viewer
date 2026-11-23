import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@axiscommunications/fluent-theme': path.resolve(__dirname, 'src/axis-fluent/fluent-theme.ts'),
      '@axiscommunications/fluent-topbar': path.resolve(__dirname, 'src/axis-fluent/fluent-topbar.tsx'),
      '@axiscommunications/fluent-empty-view': path.resolve(__dirname, 'src/axis-fluent/fluent-empty-view.tsx'),
      '@axiscommunications/fluent-styles': path.resolve(__dirname, 'src/axis-fluent/fluent-styles.ts'),
    },
  },
});
