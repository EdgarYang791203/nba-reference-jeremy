<script setup lang="ts">
import AppHeader from '~/components/layout/AppHeader.vue';
import AppFooter from '~/components/layout/AppFooter.vue';
import GlobalLoading from '~/components/common/GlobalLoading.vue';
import GlobalDialog from '~/components/common/GlobalDialog.vue';
</script>

<template>
    <div class="console-grid relative flex min-h-screen flex-col font-sans text-cream">
        <div class="console-vignette absolute inset-0" aria-hidden="true" />
        <AppHeader />
        <main class="relative flex-1">
            <slot />
        </main>
        <AppFooter />
        <GlobalLoading />
        <GlobalDialog />
    </div>
</template>
