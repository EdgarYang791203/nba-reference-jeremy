<!--
  @file PlayerStatusWindow.vue
  @description NBA_FEED 狀態視窗（設計稿主欄）：頭像 140 + 像素大名 + 隊色/30+/可寫人物稿 tag + meta 行
  + HOT/NEW StatBar + StatRow ×5 + 「今日推薦寫作題材」equipment 子視窗。
  @param player - 目前頁籤球員（'全部' 時傳最近有素材的球員）
  @param stats - 各項數值
  @param topics - 今日推薦題材（TODO(功能二)：目前為 mock）
-->
<script setup lang="ts">
import { computed } from 'vue';
import type { Player } from '~/types/api';
import { ageFrom, formatDate } from '~/utils/date';
import { useTheme } from '~/composables/useTheme';
import RpgWindow from '~/components/ui/RpgWindow.vue';
import RpgTag from '~/components/ui/RpgTag.vue';
import StatBar from '~/components/ui/StatBar.vue';
import StatRow from '~/components/ui/StatRow.vue';

const props = defineProps<{
    player: Player | null;
    stats: {
        hot: number;
        hotMax: number;
        unread: number;
        unreadMax: number;
        total: number;
        recent: number;
        usedInArticles: number;
        drafts: number;
        sources: number;
        updatedAt: string | null;
    };
    topics: string[];
}>();

const emit = defineEmits<{
    'row-click': [key: 'total' | 'recent' | 'used' | 'drafts' | 'sources'];
}>();

const { theme } = useTheme();
const portrait = computed(() =>
    theme.value === 'light' ? '/pixel/portrait-light-280.png' : '/pixel/portrait-dark-280.png'
);

const title = computed(() =>
    props.player ? `NBA_FEED — ${props.player.name} [player_status.v1]` : 'NBA_FEED — ALL [player_status.v1]'
);

const metaLine = computed(() => {
    if (!props.player) {
        return '30 歲以上球員總覽';
    }
    const parts = [props.player.team, `${ageFrom(props.player.birthDate)} 歲`];
    if (props.stats.updatedAt) {
        parts.push(`素材更新於 ${formatDate(props.stats.updatedAt)}`);
    }
    return parts.join(' ・ ');
});
</script>

<template>
    <RpgWindow :title="title" status="ok" body-class="flex flex-col gap-5 p-5 lg:p-6">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div
                class="h-[140px] w-[140px] shrink-0 overflow-hidden border-2 border-gold bg-panel-2 portrait-glow"
            >
                <img
                    :src="portrait"
                    alt="通用像素球員頭像（非特定球員）"
                    class="pixel-asset block h-[136px] w-[136px] object-cover"
                    loading="lazy"
                    decoding="async"
                />
            </div>
            <div class="flex flex-col gap-3">
                <div class="flex flex-wrap items-center gap-3">
                    <span class="font-pixel text-3xl leading-none text-cream md:text-[44px]">
                        {{ player?.name ?? '全部球員' }}
                    </span>
                    <RpgTag v-if="player" :team="player.team">{{ player.team }}</RpgTag>
                    <RpgTag color="blue">30+ 名單</RpgTag>
                    <!-- TODO(功能二): 依近 3 天素材 ≥ 2 篇判斷是否可寫人物稿 -->
                    <RpgTag v-if="stats.recent >= 2" color="brown">可寫人物稿</RpgTag>
                </div>
                <div class="text-sm text-muted">{{ metaLine }}</div>
            </div>
        </div>

        <div class="flex flex-col gap-3">
            <StatBar label="HOT" :value="stats.hot" :max="stats.hotMax" color="hp" />
            <StatBar label="NEW" :value="stats.unread" :max="stats.unreadMax" color="sp" />
        </div>

        <div class="divide-y divide-line-2">
            <StatRow label="素材總數" :value="stats.total" clickable @click="emit('row-click', 'total')" />
            <StatRow label="近 3 天新增" :value="stats.recent" clickable @click="emit('row-click', 'recent')" />
            <StatRow label="已用於文章" :value="stats.usedInArticles" clickable @click="emit('row-click', 'used')" />
            <StatRow label="待發佈草稿" :value="stats.drafts" clickable @click="emit('row-click', 'drafts')" />
            <StatRow label="來源媒體" :value="stats.sources" clickable @click="emit('row-click', 'sources')" />
        </div>

        <!-- Equipment box（DS）：今日推薦寫作題材。TODO(功能二): 接 GET /api/topics?active=true -->
        <RpgWindow variant="inner" body-class="flex flex-col gap-2 px-5 py-4">
            <span class="font-mono text-xs text-muted">// equipment: recommended_topics.today</span>
            <span class="font-pixel text-[28px] leading-tight text-cream">今日推薦寫作題材</span>
            <div v-for="(topic, index) in topics" :key="index" class="flex items-center gap-2.5">
                <span class="font-press text-[9px] text-gold">{{ String(index + 1).padStart(2, '0') }}</span>
                <span class="text-sm text-cream">{{ topic }}</span>
            </div>
            <span class="text-xs text-muted">（每日情報卷軸 · 05:30 更新）</span>
        </RpgWindow>
    </RpgWindow>
</template>

<style scoped>
.portrait-glow {
    box-shadow: 0 0 18px var(--c-glow-strong) inset;
}
</style>
