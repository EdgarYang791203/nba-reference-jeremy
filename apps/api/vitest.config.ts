import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        name: 'api',
        include: ['tests/**/*.test.ts'],
        // pglite wasm 開機約 0.5–1s
        testTimeout: 20_000,
        hookTimeout: 30_000
    }
});
