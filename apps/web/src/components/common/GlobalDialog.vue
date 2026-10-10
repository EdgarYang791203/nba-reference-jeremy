<!--
  @file GlobalDialog.vue
  @description 全域 dialog（自 fbcom 移植、改 RPG 視窗風）。由 global store 的 openDialog() 驅動；
  按鈕 action 回傳 false 可阻止關閉。功能三破壞性 action 的確認流程（9B.3）將沿用此元件。
-->
<script lang="ts" setup>
import { ref } from 'vue';
import { useGlobalStore } from '~/stores/global';
import type { DialogButtonConfig, DialogStatus } from '~/stores/global';
import RpgWindow from '~/components/ui/RpgWindow.vue';
import RpgButton from '~/components/ui/RpgButton.vue';

const globalStore = useGlobalStore();

type PendingSlot = 'primary' | 'secondary' | null;
const pending = ref<PendingSlot>(null);

async function handleAction(slot: 'primary' | 'secondary') {
    const btn: DialogButtonConfig | undefined =
        slot === 'primary'
            ? globalStore.dialogConfig?.primary
            : globalStore.dialogConfig?.secondary;
    if (!btn) {
        return;
    }

    if (!btn.action) {
        globalStore.closeDialog();
        return;
    }

    pending.value = slot;
    try {
        const result = await btn.action();
        if (result !== false) {
            globalStore.closeDialog();
        }
    } finally {
        pending.value = null;
    }
}

const statusTitleClass: Record<DialogStatus, string> = {
    success: 'text-sp',
    error: 'text-hp',
    normal: 'text-cream'
};
</script>

<template>
    <div
        v-if="globalStore.isDialogOpen"
        class="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 p-4"
        role="dialog"
        aria-modal="true"
    >
        <RpgWindow class="w-full max-w-md">
            <template #header>
                <h2
                    class="font-pixel text-xl leading-none"
                    :class="statusTitleClass[globalStore.dialogConfig?.status ?? 'normal']"
                >
                    {{ globalStore.dialogConfig?.title }}
                </h2>
            </template>

            <p class="text-sm leading-relaxed text-cream">
                {{ globalStore.dialogConfig?.content }}
            </p>

            <div class="mt-6 flex justify-end gap-3">
                <RpgButton
                    v-if="globalStore.dialogConfig?.secondary"
                    :variant="globalStore.dialogConfig.secondary.variant ?? 'secondary'"
                    :loading="pending === 'secondary'"
                    :disabled="pending !== null"
                    @click="handleAction('secondary')"
                >
                    {{ globalStore.dialogConfig.secondary.title }}
                </RpgButton>
                <RpgButton
                    v-if="globalStore.dialogConfig?.primary"
                    :variant="globalStore.dialogConfig.primary.variant ?? 'primary'"
                    :loading="pending === 'primary'"
                    :disabled="pending !== null"
                    @click="handleAction('primary')"
                >
                    {{ globalStore.dialogConfig.primary.title }}
                </RpgButton>
            </div>
        </RpgWindow>
    </div>
</template>
