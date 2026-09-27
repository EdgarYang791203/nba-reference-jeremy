import { describe, expect, it } from 'vitest';
import { getAgeAt, getSeasonCutoffDate, isEligible } from '../src/domain/season';

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe('getSeasonCutoffDate', () => {
    it('賽季中（10 月起）用該賽季開打日', () => {
        expect(getSeasonCutoffDate(utc(2026, 11, 15))).toEqual(utc(2026, 10, 21));
        expect(getSeasonCutoffDate(utc(2026, 10, 1))).toEqual(utc(2026, 10, 21));
    });

    it('1–5 月屬於去年開打的賽季', () => {
        expect(getSeasonCutoffDate(utc(2027, 3, 1))).toEqual(utc(2026, 10, 21));
        expect(getSeasonCutoffDate(utc(2027, 5, 31))).toEqual(utc(2026, 10, 21));
    });

    it('休賽季（6–9 月）用下賽季開打日', () => {
        expect(getSeasonCutoffDate(utc(2026, 6, 1))).toEqual(utc(2026, 10, 21));
        expect(getSeasonCutoffDate(utc(2026, 9, 30))).toEqual(utc(2026, 10, 21));
    });

    it('可注入不同開打日', () => {
        expect(getSeasonCutoffDate(utc(2026, 12, 1), { month: 10, day: 24 })).toEqual(
            utc(2026, 10, 24)
        );
    });
});

describe('getAgeAt', () => {
    it('生日當天算滿歲', () => {
        expect(getAgeAt(utc(1996, 10, 21), utc(2026, 10, 21))).toBe(30);
    });

    it('生日隔天前未滿歲', () => {
        expect(getAgeAt(utc(1996, 10, 22), utc(2026, 10, 21))).toBe(29);
    });
});

describe('isEligible', () => {
    const cutoff = utc(2026, 10, 21);

    it('開打日已滿 30 → 合格', () => {
        expect(isEligible({ birthDate: '1996-10-21' }, cutoff)).toBe(true);
        expect(isEligible({ birthDate: '1990-01-01' }, cutoff)).toBe(true);
    });

    it('開打日未滿 30 → 不合格', () => {
        expect(isEligible({ birthDate: '1996-10-22' }, cutoff)).toBe(false);
    });

    it('active=false 一律不合格', () => {
        expect(isEligible({ birthDate: '1990-01-01', active: false }, cutoff)).toBe(false);
    });

    it('無效生日不合格且不 throw', () => {
        expect(isEligible({ birthDate: 'not-a-date' }, cutoff)).toBe(false);
    });

    it('minAge 可調（config 表帶入）', () => {
        expect(isEligible({ birthDate: '1996-10-21' }, cutoff, 31)).toBe(false);
    });
});
