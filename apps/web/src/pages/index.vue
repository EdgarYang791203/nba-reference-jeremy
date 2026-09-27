<!--
  共用組件 showcase：骨架階段的視覺驗收頁（對照 Design 畫布），
  正式頁面（/materials、/articles、/issues）於里程碑 3+ 實作後可移除或移到 /dev/ui。
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import RpgWindow from '~/components/ui/RpgWindow.vue';
import RpgButton from '~/components/ui/RpgButton.vue';
import RpgTag from '~/components/ui/RpgTag.vue';
import RpgTabs from '~/components/ui/RpgTabs.vue';
import StatBar from '~/components/ui/StatBar.vue';
import StatRow from '~/components/ui/StatRow.vue';
import Breadcrumb from '~/components/common/Breadcrumb.vue';
import Accordion from '~/components/common/Accordion.vue';
import Pagination from '~/components/common/Pagination.vue';
import AppLink from '~/components/common/AppLink.vue';
import { useGlobalStore } from '~/stores/global';

const globalStore = useGlobalStore();

const activeTab = ref('curry');
const tabs = computed(() => [
    { key: 'curry', label: 'Stephen Curry · GSW', count: 3 },
    { key: 'lebron', label: 'LeBron James · LAL', count: 5 },
    { key: 'durant', label: 'Kevin Durant · PHX', count: 2 }
]);

const page = ref(3);

function demoDialog() {
    globalStore.openDialog({
        title: '確認執行',
        content: '破壞性 action 執行前顯示摘要要求確認（9B.3 的確認流程將沿用此 dialog）。',
        status: 'normal',
        primary: { title: '確認', variant: 'primary' },
        secondary: { title: '取消', variant: 'secondary' }
    });
}
</script>

<template>
    <div class="space-y-8">
        <Breadcrumb :items="[{ label: '共用組件展示' }]" />

        <RpgWindow title="狀態視窗">
            <div class="space-y-4">
                <StatBar label="HOT" :value="14" :max="20" color="hp" />
                <StatBar label="NEW" :value="6" :max="20" color="sp" />
                <div class="divide-y divide-line-2">
                    <StatRow label="今日素材" :value="14" clickable />
                    <StatRow label="待發佈草稿" :value="3" clickable />
                    <StatRow label="本週用量 (USD)" value="0.42" />
                </div>
            </div>
        </RpgWindow>

        <RpgWindow title="球員頁籤">
            <RpgTabs v-model="activeTab" :tabs="tabs" />
            <p class="mt-4 text-sm text-muted">選中：{{ activeTab }}</p>
        </RpgWindow>

        <RpgWindow title="標籤與按鈕">
            <div class="flex flex-wrap items-center gap-3">
                <RpgTag color="gold">NEW</RpgTag>
                <RpgTag team="lal">LAL</RpgTag>
                <RpgTag team="gsw">GSW</RpgTag>
                <RpgTag color="source">ESPN</RpgTag>
                <RpgTag color="brown">控球後衛</RpgTag>
            </div>
            <div class="mt-4 flex flex-wrap gap-3">
                <RpgButton variant="primary" @click="demoDialog">主要按鈕</RpgButton>
                <RpgButton variant="secondary">次要按鈕</RpgButton>
                <RpgButton variant="danger">危險操作</RpgButton>
                <RpgButton variant="primary" loading>載入中</RpgButton>
            </div>
        </RpgWindow>

        <RpgWindow title="內層子視窗" variant="inner">
            <p class="font-pixel text-lg text-gold">今日推薦寫作題材</p>
            <ul class="mt-2 space-y-1 text-sm text-cream">
                <li>▶ Curry 談季前訓練與新陣容磨合</li>
                <li>▶ LeBron 生涯第 24 季的定位轉變</li>
                <li>▶ 老將中鋒市場的連鎖效應</li>
            </ul>
        </RpgWindow>

        <Accordion
            title="注意事項"
            :list="['素材為摘要 + 短引述 + 原文連結，不整篇翻譯轉載。', '圖片只存外連 URL，不轉存。']"
        />

        <RpgWindow title="分頁">
            <Pagination v-model="page" :total-items="120" :page-size="10" />
        </RpgWindow>

        <p class="text-sm text-muted">
            規格見
            <AppLink
                href="https://github.com/EdgarYang791203/nab-reference-jeremy"
                icon="external"
                class="text-gold hover:brightness-110"
            >
                repo docs
            </AppLink>
        </p>
    </div>
</template>
