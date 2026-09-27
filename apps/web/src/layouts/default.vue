<script setup lang="ts">
import GlobalLoading from '~/components/common/GlobalLoading.vue';
import GlobalDialog from '~/components/common/GlobalDialog.vue';
</script>

<template>
    <div class="min-h-screen bg-bg font-sans text-cream">
        <main class="mx-auto max-w-6xl px-4 py-8">
            <slot />
        </main>
        <GlobalLoading />
        <GlobalDialog />
    </div>
</template>
