<!--
  @file MaterialDetailDialog.vue
  @description 素材完整圖文視窗（計畫書 4.8）：el-dialog 覆蓋成 AI Console 視窗風。
  內容：標題、隊色/來源/tags、外連圖（失敗切像素底圖）、摘要、原文引述、底部來源網址。
  @param material - 要顯示的素材（null = 關閉）
  @param team - 球隊縮寫
-->
<script setup lang="ts">
import { computed } from 'vue';
import type { Material } from '~/types/api';
import { formatDate } from '~/utils/date';
import BaseImage from '~/components/common/BaseImage.vue';
import AppLink from '~/components/common/AppLink.vue';
import RpgTag from '~/components/ui/RpgTag.vue';

const props = defineProps<{
    material: Material | null;
    team?: string;
}>();

const emit = defineEmits<{
    close: [];
}>();

const visible = computed({
    get: () => props.material !== null,
    set: (value: boolean) => {
        if (!value) {
            emit('close');
        }
    }
});

const paragraphs = computed(() =>
    (props.material?.summaryZh ?? '')
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
);

const fallbackSrc = computed(() => `/pixel/thumb-${((props.material?.id ?? 0) % 4) + 1}-610.jpg`);
</script>

<template>
    <ClientOnly>
        <el-dialog
            v-model="visible"
            class="material-dialog"
            width="min(880px, 94vw)"
            :show-close="false"
            align-center
            destroy-on-close
        >
            <template #header="{ close }">
                <div
                    class="flex items-center justify-between border-b-2 border-line bg-head px-3.5 py-2 font-mono text-[13px] text-on-head"
                >
                    <span class="flex items-center gap-2">
                        <span class="text-sp" aria-hidden="true">●</span>
                        MATERIAL.view — #{{ material?.id }}
                    </span>
                    <button
                        type="button"
                        class="font-press text-[10px] text-gold hover:brightness-110"
                        aria-label="關閉"
                        @click="close"
                    >
                        [X]
                    </button>
                </div>
            </template>

            <div v-if="material" class="flex flex-col gap-5 p-5 text-cream lg:p-6">
                <div class="flex flex-wrap items-center gap-2">
                    <RpgTag v-if="team" :team="team">{{ team }}</RpgTag>
                    <RpgTag v-if="material.sourceName" color="source">{{ material.sourceName }}</RpgTag>
                    <RpgTag v-for="tag in material.tags" :key="tag" color="brown">{{ tag }}</RpgTag>
                </div>

                <h2 class="font-pixel text-2xl leading-tight md:text-[32px]">{{ material.titleZh }}</h2>
                <p class="text-xs text-muted">
                    {{ formatDate(material.publishedAt ?? material.date) }} · {{ material.sourceName ?? '—' }}
                </p>

                <div class="overflow-hidden border-2 border-line-2 bg-panel-2">
                    <BaseImage
                        :src="material.imageUrl"
                        :fallback-src="fallbackSrc"
                        :alt="material.titleZh"
                        class="block aspect-video w-full object-cover"
                        pixel
                    />
                </div>

                <div class="flex flex-col gap-3 text-sm leading-[22px]">
                    <p v-for="(paragraph, index) in paragraphs" :key="index">{{ paragraph }}</p>
                </div>

                <section v-if="material.keyQuotes.length" class="flex flex-col gap-2">
                    <span class="font-mono text-xs text-muted">// key_quotes（原文）</span>
                    <blockquote
                        v-for="(quote, index) in material.keyQuotes"
                        :key="index"
                        class="border-l-2 border-gold bg-panel-2 px-4 py-2 font-mono text-[13px] italic text-cream"
                    >
                        “{{ quote }}”
                    </blockquote>
                </section>

                <footer class="flex flex-wrap items-center justify-between gap-2 border-t-2 border-line-2 pt-4 text-xs text-muted">
                    <span>來源：{{ material.sourceName ?? '—' }}（摘要 + 短引述，不整篇轉載）</span>
                    <AppLink :href="material.sourceUrl" icon="external" class="text-gold hover:brightness-110">
                        閱讀原文
                    </AppLink>
                </footer>
            </div>
        </el-dialog>
    </ClientOnly>
</template>

<style>
/* 全域覆蓋 el-dialog 為視窗風（不能 scoped：el-dialog 內容 teleport 到 body） */
.material-dialog.el-dialog {
    padding: 0;
    background: var(--c-panel);
    border: 2px solid var(--c-line, var(--c-border));
    box-shadow: 4px 4px 0 0 var(--c-shadow-hard), 0 0 24px var(--c-glow);
}
.material-dialog .el-dialog__header {
    padding: 0;
    margin: 0;
}
.material-dialog .el-dialog__body {
    padding: 0;
    max-height: 80vh;
    overflow-y: auto;
}
</style>
