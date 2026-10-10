<!--
  @file DailyTopicsLog.vue
  @description DAILY_TOPICS.log 視窗：近期題材／素材標題清單（gold 方塊 = 近 2 天，line-2 = 更早）。
  @param items - { title, meta, recent }[]
-->
<script setup lang="ts">
import RpgWindow from '~/components/ui/RpgWindow.vue';

defineProps<{
    items: Array<{ title: string; meta: string; recent: boolean }>;
}>();
</script>

<template>
    <RpgWindow title="DAILY_TOPICS.log" status="ok" body-class="flex flex-col gap-3 px-5 py-4">
        <div v-for="(item, index) in items" :key="index" class="flex gap-2.5">
            <i
                class="mt-1.5 block h-2 w-2 shrink-0"
                :class="item.recent ? 'bg-gold' : 'bg-line-2'"
                aria-hidden="true"
            />
            <div class="flex flex-col gap-0.5">
                <span class="text-sm font-medium text-cream">{{ item.title }}</span>
                <span class="text-xs text-muted">{{ item.meta }}</span>
            </div>
        </div>
        <p v-if="!items.length" class="text-xs text-muted">尚無紀錄</p>
    </RpgWindow>
</template>
