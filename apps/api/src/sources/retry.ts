/** 每篇擷取最多重試 2 次（計畫書 4.4 步驟 4）。sleep 可注入以利測試。 */
export interface RetryOptions {
    times?: number;
    delayMs?: number;
    sleep?: (ms: number) => Promise<void>;
}

export async function retry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const times = options.times ?? 2;
    const delayMs = options.delayMs ?? 500;
    const sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    let lastError: unknown;
    for (let attempt = 0; attempt <= times; attempt++) {
        try {
            return await fn(attempt);
        } catch (error) {
            lastError = error;
            if (attempt < times) {
                await sleep(delayMs * (attempt + 1));
            }
        }
    }
    throw lastError;
}
