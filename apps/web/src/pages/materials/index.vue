<!--
  素材頁 /materials（計畫書 4.8；版面依 Design 畫布「素材列表頁 1440」）。
  球員頁籤 + new badge（4.2）；點卡片開完整圖文；routeRules ISR 3600（nuxt.config）。
  資料流：一次取全部已發佈素材（mock 或 GET /api/materials），前端依頁籤／來源篩選、漸進式顯示。
  TODO(討論): 素材量大後改為 server 端 playerId/source/page 篩選（API 已支援參數）。
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Material, Player } from '~/types/api';
import { useApi } from '~/composables/useApi';
import { useNewBadge } from '~/composables/useNewBadge';
import { formatMonthDay, isWithinDays } from '~/utils/date';
import RpgTabs from '~/components/ui/RpgTabs.vue';
import Marquee from '~/components/materials/Marquee.vue';
import ArenaBanner from '~/components/materials/ArenaBanner.vue';
import PlayerStatusWindow from '~/components/materials/PlayerStatusWindow.vue';
import SceneWindow from '~/components/materials/SceneWindow.vue';
import HudWindow from '~/components/materials/HudWindow.vue';
import DailyTopicsLog from '~/components/materials/DailyTopicsLog.vue';
import AiAssistBar from '~/components/materials/AiAssistBar.vue';
import SourceChips from '~/components/materials/SourceChips.vue';
import MaterialGrid from '~/components/materials/MaterialGrid.vue';
import MaterialDetailDialog from '~/components/materials/MaterialDetailDialog.vue';

useHead({ title: '素材庫 · NBA 素材站' });

const api = useApi();

const { data: players } = await useAsyncData<Player[]>('players', () => api.getPlayers({ eligible: true }), {
    default: () => []
});
const { data: materialsPage } = await useAsyncData('materials:all', () => api.getMaterials({}), {
    default: () => ({ items: [], page: 1, pageSize: 20, total: 0 })
});

const materials = computed<Material[]>(() => materialsPage.value?.items ?? []);
const playerIds = computed(() => players.value.map((p) => p.id));
const playerById = computed(() => new Map(players.value.map((p) => [p.id, p])));
const teamOf = computed<Record<number, string>>(() =>
    Object.fromEntries(players.value.map((p) => [p.id, p.team]))
);

/* ── new badge ───────────────────────────────────────────────── */
const { isNew, markSeen, loaded: badgeLoaded } = useNewBadge(playerIds);
const isMaterialNew = (m: Material) => isNew(m.playerId, m.createdAt);

/* ── 頁籤（球員）與來源 ─────────────────────────────────────── */
const selectedTab = ref<string>('all');
const selectedSource = ref<string>('');

const countByPlayer = computed(() => {
    const counts = new Map<number, number>();
    for (const m of materials.value) {
        counts.set(m.playerId, (counts.get(m.playerId) ?? 0) + 1);
    }
    return counts;
});

const tabs = computed(() => [
    { key: 'all', label: '全部', count: materials.value.length },
    ...players.value
        .filter((p) => (countByPlayer.value.get(p.id) ?? 0) > 0)
        .map((p) => ({ key: String(p.id), label: `${p.name} · ${p.team}`, count: countByPlayer.value.get(p.id) ?? 0 }))
]);

const playerHasNew = (playerId: number) =>
    badgeLoaded.value && materials.value.some((m) => m.playerId === playerId && isMaterialNew(m));

watch(selectedTab, (key) => {
    if (key !== 'all') {
        markSeen(key);
    }
});

const sources = computed(() =>
    [...new Set(materials.value.map((m) => m.sourceName).filter((s): s is string => Boolean(s)))].sort()
);

const filtered = computed(() =>
    materials.value.filter((m) => {
        if (selectedTab.value !== 'all' && String(m.playerId) !== selectedTab.value) {
            return false;
        }
        if (selectedSource.value && m.sourceName !== selectedSource.value) {
            return false;
        }
        return true;
    })
);

/* ── 狀態視窗數值 ──────────────────────────────────────────── */
const focusPlayer = computed<Player | null>(() => {
    if (selectedTab.value !== 'all') {
        return playerById.value.get(Number(selectedTab.value)) ?? null;
    }
    const latest = materials.value[0];
    return latest ? (playerById.value.get(latest.playerId) ?? null) : null;
});

const scopeMaterials = computed(() =>
    focusPlayer.value ? materials.value.filter((m) => m.playerId === focusPlayer.value!.id) : materials.value
);

const stats = computed(() => {
    const recent = scopeMaterials.value.filter((m) => isWithinDays(m.createdAt, 3)).length;
    const unread = badgeLoaded.value ? scopeMaterials.value.filter(isMaterialNew).length : 0;
    return {
        hot: recent,
        hotMax: 20,
        unread,
        unreadMax: Math.max(scopeMaterials.value.length, 1),
        total: scopeMaterials.value.length,
        recent,
        usedInArticles: 0, // TODO(功能二): drafts.materialIds 反查
        drafts: 0, // TODO(功能二): GET /api/drafts?status=draft
        sources: new Set(scopeMaterials.value.map((m) => m.sourceName)).size,
        updatedAt: scopeMaterials.value[0]?.createdAt ?? null
    };
});

const todayTitles = computed(() =>
    materials.value.filter((m) => isWithinDays(m.createdAt, 1)).map((m) => m.titleZh)
);

const bannerStats = computed(() => [
    `今日 ${materials.value.filter((m) => isWithinDays(m.createdAt, 1)).length} 篇`,
    `近 3 天 ${materials.value.filter((m) => isWithinDays(m.createdAt, 3)).length} 篇`,
    `30+ 名單 ${players.value.length} 人`
]);

// TODO(功能二): 接每日推薦題材 API；目前為設計稿示意文案
const topics = [
    'LeBron 第 24 季的「最後一舞」敘事',
    'Curry 的 38 歲三分紀錄還能撐多久？',
    'Durant 傷停對太陽季初輪替的影響'
];

const topicsLog = computed(() =>
    materials.value.slice(0, 3).map((m) => ({
        title: m.titleZh,
        meta: `${formatMonthDay(m.publishedAt ?? m.date)} · ${m.sourceName ?? '—'}`,
        recent: isWithinDays(m.createdAt, 2)
    }))
);

// TODO(M4): 接 GET /api/usage 與 runs；目前為 mock HUD
const schedulerRows = computed(() => [
    { key: `runs[${new Date().toISOString().slice(0, 10)}]`, value: 'mock', tone: 'ok' as const },
    { key: 'materials.today', value: `${String(todayTitles.value.length).padStart(2, '0')} / 20` },
    { key: 'batch.collect', value: '—', tone: 'muted' as const },
    { key: 'next.draft', value: '—', tone: 'muted' as const }
]);
const budgetRows = [
    { key: 'interactive', value: '$0.00 / $2.00', bar: { percent: 0, color: 'gold' as const } },
    { key: 'scheduler.month', value: '$0.00 / $8.50', bar: { percent: 0, color: 'sp' as const } },
    { key: 'killSwitch', value: 'off', tone: 'ok' as const }
];

/* ── 詳情視窗 ──────────────────────────────────────────────── */
const activeMaterial = ref<Material | null>(null);
function openMaterial(material: Material) {
    activeMaterial.value = material;
}

function onRowClick(key: string) {
    // TODO(討論): 各列點擊的導向（目前只捲到卡片格）
    if (key === 'total' || key === 'recent') {
        document.getElementById('material-grid')?.scrollIntoView({ behavior: 'smooth' });
    }
}
</script>

<template>
    <div>
        <div class="mx-auto max-w-[1440px] px-4 pt-5 lg:px-20">
            <Marquee :items="todayTitles" />
        </div>

        <ArenaBanner class="mt-5" :stats="bannerStats" />

        <div class="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pb-2 pt-7 lg:flex-row lg:items-start lg:px-20">
            <PlayerStatusWindow
                class="flex-1"
                :player="focusPlayer"
                :stats="stats"
                :topics="topics"
                @row-click="onRowClick"
            />
            <aside class="flex w-full flex-col gap-6 lg:w-[400px]">
                <SceneWindow />
                <DailyTopicsLog :items="topicsLog" />
                <HudWindow title="SCHEDULER.status" :rows="schedulerRows" />
                <HudWindow title="BUDGET.week" :rows="budgetRows" />
                <AiAssistBar />
            </aside>
        </div>

        <div
            id="material-grid"
            class="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 pb-2 pt-7 lg:flex-row lg:items-start lg:justify-between lg:px-20"
        >
            <RpgTabs v-model="selectedTab" :tabs="tabs">
                <template #badge="{ tab }">
                    <span
                        v-if="tab.key !== 'all' && playerHasNew(Number(tab.key))"
                        class="bg-gold px-1.5 py-0.5 font-press text-[8px] text-on-gold"
                        :class="{ 'bg-on-gold text-gold': tab.key === selectedTab }"
                    >
                        NEW
                    </span>
                </template>
            </RpgTabs>
            <SourceChips v-model="selectedSource" :sources="sources" />
        </div>

        <div class="mx-auto max-w-[1440px] px-4 pt-2 lg:px-20">
            <MaterialGrid :items="filtered" :team-of="teamOf" :is-new="isMaterialNew" @open="openMaterial" />
        </div>

        <MaterialDetailDialog
            :material="activeMaterial"
            :team="activeMaterial ? teamOf[activeMaterial.playerId] : undefined"
            @close="activeMaterial = null"
        />
    </div>
</template>
