import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.string().default('development'),
    PORT: z.coerce.number().default(8787),
    DATABASE_URL: z.string().optional(),
    /** 'mock' | 'anthropic'；未設或無 key → mock */
    LLM_PROVIDER: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    /** Cloudflare ↔ Cloud Run 共享 header（M4） */
    CF_ORIGIN_SECRET: z.string().optional()
});

export type Env = z.infer<typeof envSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
    return envSchema.parse(source);
}
