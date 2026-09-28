<!--
  @file HudWindow.vue
  @description HUD 視窗（DS 原則 2「HUD 模組只放真資料」）：mono k/v 列 + 可選迷你進度條。
  供 SCHEDULER.status / BUDGET.week 使用。
  @param title - 視窗標題（終端檔名）
  @param rows - { key, value, tone?: 'ok'|'value'|'muted', bar?: { percent, color } }[]
-->
<script setup lang="ts">
import { ref, watchPostEffect } from 'vue';
import RpgWindow from '~/components/ui/RpgWindow.vue';

export interface HudRow {
    key: string;
    value: string;
    tone?: 'ok' | 'value' | 'muted' | 'error';
    bar?: { percent: number; color: 'gold' | 'sp' | 'hp' };
}

const props = defineProps<{
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

const barRefs = ref<HTMLElement[]>([]);
watchPostEffect(() => {
    props.rows.forEach((row, index) => {
        const el = barRefs.value[index];
        if (el && row.bar) {
            el.style.setProperty('width', `${Math.max(0, Math.min(100, row.bar.percent))}%`);
        }
    });
});
</script>

<template>
    <RpgWindow :title="title" :status="status ?? 'ok'" body-class="flex flex-col gap-1.5 px-3.5 py-3 font-mono text-xs">
        <template v-for="(row, index) in rows" :key="row.key">
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
                <div
                    :ref="
                        (el) => {
                            barRefs[index] = el as HTMLElement;
                        }
                    "
                    class="h-1 w-0"
                    :class="{
                        'bg-gold': row.bar.color === 'gold',
                        'bg-sp': row.bar.color === 'sp',
                        'bg-hp': row.bar.color === 'hp'
                    }"
                />
            </div>
        </template>
        <slot />
    </RpgWindow>
</template>
