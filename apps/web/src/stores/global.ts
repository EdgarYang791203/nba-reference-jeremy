/** 全域 loading / dialog store（自 fbcom 移植，去掉富邦專屬的 toast 與商品意向）。 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export type DialogButtonConfig = {
    title: string;
    /** 回傳 false 可阻止 dialog 關閉（例如驗證失敗） */
    action?: () => boolean | void | Promise<boolean | void>;
    variant?: ButtonVariant;
};

export type DialogStatus = 'success' | 'error' | 'normal';

export type DialogConfig = {
    title: string;
    content: string;
    status: DialogStatus;
    primary: DialogButtonConfig;
    secondary?: DialogButtonConfig;
};

export const useGlobalStore = defineStore('global', () => {
    // loading 用計數器：多個並行請求時，全部結束才關遮罩
    const loadingCount = ref(0);
    const globalLoading = computed(() => loadingCount.value > 0);

    function globalLoadingHandler(isLoading: boolean) {
        if (isLoading) {
            loadingCount.value += 1;
            return;
        }
        loadingCount.value = Math.max(0, loadingCount.value - 1);
    }

    function forceStopLoading() {
        loadingCount.value = 0;
    }

    const dialogConfig = ref<DialogConfig | null>(null);
    const isDialogOpen = computed(() => dialogConfig.value !== null);

    function openDialog(config: DialogConfig) {
        dialogConfig.value = config;
    }

    function closeDialog() {
        dialogConfig.value = null;
    }

    return {
        loadingCount,
        globalLoading,
        globalLoadingHandler,
        forceStopLoading,
        dialogConfig,
        isDialogOpen,
        openDialog,
        closeDialog
    };
});
