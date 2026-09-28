<!--
  @file SceneWindow.vue
  @description 右欄場景視窗（DS Scene window）：4:3 像素場景圖，夜版 CONTROL_ROOM.cam / 日版 PRESS_BOX.cam。
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useTheme } from '~/composables/useTheme';
import RpgWindow from '~/components/ui/RpgWindow.vue';

const { theme } = useTheme();
const isLight = computed(() => theme.value === 'light');
const src = computed(() => (isLight.value ? '/pixel/room-day-800.jpg' : '/pixel/room-night-800.jpg'));
const title = computed(() => (isLight.value ? 'PRESS_BOX.cam' : 'CONTROL_ROOM.cam'));
</script>

<template>
    <RpgWindow :title="title" status="ok" body-class="p-0">
        <img
            :src="src"
            :alt="isLight ? '像素記者席場景（原創）' : '像素控制室場景（原創）'"
            class="pixel-asset block aspect-[4/3] w-full object-cover"
            loading="lazy"
            decoding="async"
        />
    </RpgWindow>
</template>
