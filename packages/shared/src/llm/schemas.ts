import { z } from 'zod';

/** 階段 A 篩選評分輸出（計畫書 4.5.1）。 */
export const stageAResultSchema = z.object({
    items: z.array(
        z.object({
            idx: z.number().int().nonnegative(),
            /** 新聞價值 0–5 */
            value: z.number().min(0).max(5),
            /** 是否以該球員為主體 0–5 */
            focus: z.number().min(0).max(5),
            /** 與同球員其他候選重複時回傳其 idx */
            duplicateOf: z.number().int().nonnegative().nullable()
        })
    )
});
export type StageAResult = z.infer<typeof stageAResultSchema>;

/** 階段 B 摘要生成輸出（計畫書 4.5.1）。字數界線給緩衝：
 *  規格為 titleZh ≤ 30 字、summaryZh 300–500 字，collect 驗證失敗即剔除。 */
export const materialGenSchema = z.object({
    titleZh: z.string().min(1).max(40),
    summaryZh: z.string().min(200).max(700),
    /** 原文英文引述 0–3 條；collect 階段另做子字串比對（9C.2 B4） */
    keyQuotes: z.array(z.string().min(1)).max(3),
    /** 3–6 個英文小寫 tag */
    tags: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(3).max(6)
});
export type MaterialGen = z.infer<typeof materialGenSchema>;

/** keyQuotes 子字串比對：不存在於原文者剔除（9C.2 B4）。
 *  比對前把空白正規化，避免換行/多空格造成誤殺。 */
export function verifyKeyQuotes(quotes: string[], articleText: string): string[] {
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
    const haystack = normalize(articleText);
    return quotes.filter((quote) => haystack.includes(normalize(quote)));
}
