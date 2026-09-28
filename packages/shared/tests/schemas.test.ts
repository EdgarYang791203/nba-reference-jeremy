import { describe, expect, it } from 'vitest';
import { materialGenSchema, stageAResultSchema, verifyKeyQuotes } from '../src/llm/schemas';

describe('stageAResultSchema', () => {
    it('接受合法輸出', () => {
        const parsed = stageAResultSchema.safeParse({
            items: [{ idx: 0, value: 4, focus: 5, duplicateOf: null }]
        });
        expect(parsed.success).toBe(true);
    });

    it('拒絕超界分數', () => {
        const parsed = stageAResultSchema.safeParse({
            items: [{ idx: 0, value: 9, focus: 5, duplicateOf: null }]
        });
        expect(parsed.success).toBe(false);
    });
});

describe('materialGenSchema', () => {
    const valid = {
        titleZh: '柯瑞談季前訓練',
        summaryZh: '摘'.repeat(300),
        keyQuotes: ['I feel great.'],
        tags: ['warriors', 'curry', 'preseason']
    };

    it('接受合法輸出', () => {
        expect(materialGenSchema.safeParse(valid).success).toBe(true);
    });

    it('拒絕 tags 非英文小寫', () => {
        expect(
            materialGenSchema.safeParse({ ...valid, tags: ['Warriors', 'curry', 'x'] }).success
        ).toBe(false);
    });

    it('拒絕 keyQuotes 超過 3 條', () => {
        expect(
            materialGenSchema.safeParse({ ...valid, keyQuotes: ['a', 'b', 'c', 'd'] }).success
        ).toBe(false);
    });
});

describe('verifyKeyQuotes', () => {
    const article = 'Curry said: "I feel great\n  about the team." He smiled.';

    it('存在於原文者保留（空白正規化後比對）', () => {
        expect(verifyKeyQuotes(['I feel great about the team.'], article)).toHaveLength(1);
    });

    it('不存在者剔除', () => {
        expect(verifyKeyQuotes(['I feel terrible.'], article)).toHaveLength(0);
    });
});
