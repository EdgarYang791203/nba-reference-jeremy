<!--
  @file SceneWindow.vue
  @description 右欄場景視窗（DS Scene window）：4:3 像素場景圖，夜版 CONTROL_ROOM.cam / 日版 PRESS_BOX.cam。
  夜／日版圖片與標題同時輸出，由 html.dark 決定顯示：HTML 不依賴使用者主題，hydration 後不換圖；
  隱藏那張 loading=lazy 不下載。
-->
<script setup lang="ts">
import RpgWindow from '~/components/ui/RpgWindow.vue';
</script>

<template>
    <RpgWindow body-class="p-0">
        <template #header>
            <h2 class="flex items-center gap-2 font-mono text-[13px] leading-tight tracking-[0.5px]">
                <span class="text-sp" aria-hidden="true">●</span>
                <span class="hidden dark:inline">CONTROL_ROOM.cam</span>
                <span class="dark:hidden">PRESS_BOX.cam</span>
            </h2>
        </template>
        <img
            src="/pixel/room-night-800.jpg"
            alt="像素控制室場景（原創）"
            class="pixel-asset hidden aspect-[4/3] w-full object-cover dark:block"
            loading="lazy"
            decoding="async"
        />
        <img
            src="/pixel/room-day-800.jpg"
            alt="像素記者席場景（原創）"
            class="pixel-asset block aspect-[4/3] w-full object-cover dark:hidden"
            loading="lazy"
            decoding="async"
        />
    </RpgWindow>
</template>
