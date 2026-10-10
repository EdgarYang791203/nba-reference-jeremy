import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    define: {
        __USE_MOCK_API__: 'false'
    },
    resolve: {
        alias: {
            '~': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    test: {
        name: 'web',
        environment: 'happy-dom',
        include: ['tests/**/*.test.ts']
    }
});
