import type { Context } from 'hono';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../services/errors';

/** 所有 request body / query 走 zod（9C.2 B1）；失敗丟 ValidationError → 400。 */
export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        throw new ValidationError('invalid request', result.error.issues);
    }
    return result.data;
}

export async function parseBody<T>(c: Context, schema: ZodSchema<T>): Promise<T> {
    let body: unknown;
    try {
        body = await c.req.json();
    } catch {
        throw new ValidationError('body must be JSON');
    }
    return parseOrThrow(schema, body);
}

/** 統一成功 envelope */
export function ok<T>(c: Context, data: T, status: 200 | 201 = 200) {
    return c.json({ ok: true as const, data }, status);
}
