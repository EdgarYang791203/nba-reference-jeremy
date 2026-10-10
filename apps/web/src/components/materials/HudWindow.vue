<!--
  @file HudWindow.vue
  @description HUD 視窗（DS 原則 2「HUD 模組只放真資料」）：mono k/v 列 + 可選迷你進度條。
  供 SCHEDULER.status / BUDGET.week 使用。
  @param title - 視窗標題（終端檔名）
  @param rows - { key, value, tone?: 'ok'|'value'|'muted', bar?: { percent, color } }[]
-->
<script setup lang="ts">
import RpgWindow from '~/components/ui/RpgWindow.vue';

export interface HudRow {
    key: string;
    value: string;
    tone?: 'ok' | 'value' | 'muted' | 'error';
    bar?: { percent: number; color: 'gold' | 'sp' | 'hp' };
}

defineProps<{
    title: string;
    rows: HudRow[];
    status?: 'ok' | 'idle' | 'error';
}>();

const toneClass: Record<NonNullable<HudRow['tone']>, string> = {
    ok: 'text-sp',
    value: 'text-highlight font-bold',
    muted: 'text-muted',
    error: 'text-hp'
};

/** 條寬以 SVG <rect width="n%"> 繪製（屬性非 inline style），SSR 即有寬度，hydration 後不會從 0 長出 */
function barPercent(percent: number): number {
    return Math.max(0, Math.min(100, percent));
}
</script>

<template>
    <RpgWindow :title="title" :status="status ?? 'ok'" body-class="flex flex-col gap-1.5 px-3.5 py-3 font-mono text-xs">
        <template v-for="row in rows" :key="row.key">
            <div class="flex justify-between gap-3">
                <span class="text-muted">{{ row.key }}</span>
                <span :class="toneClass[row.tone ?? 'value']">{{ row.value }}</span>
            </div>
            <div
                v-if="row.bar"
                class="h-2.5 border-2 border-line bg-track p-px"
                role="meter"
                :aria-valuenow="row.bar.percent"
                :aria-valuemin="0"
                :aria-valuemax="100"
                :aria-label="row.key"
            >
                <svg class="block h-1 w-full" preserveAspectRatio="none" aria-hidden="true">
                    <rect
                        x="0"
                        y="0"
                        :width="`${barPercent(row.bar.percent)}%`"
                        height="100%"
                        :class="{
                            'fill-gold': row.bar.color === 'gold',
                            'fill-sp': row.bar.color === 'sp',
                            'fill-hp': row.bar.color === 'hp'
                        }"
                    />
                </svg>
            </div>
        </template>
        <slot />
    </RpgWindow>
</template>
