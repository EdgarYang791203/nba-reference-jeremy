<!--
  @file AiAssistBar.vue
  @description AI_ASSIST 入口條（設計稿右欄最下）。
  TODO(功能三): 改為 Live2D Hijiki 入口 + 三分類選單 + Access 登入（計畫書 9B、9F）；目前為靜態示意。
-->
<template>
    <section class="flex items-center gap-3.5 border-2 border-line bg-panel-2 px-3.5 py-3">
        <svg
            width="48"
            height="48"
            viewBox="0 0 12 12"
            aria-hidden="true"
            class="pixel-asset shrink-0"
        >
            <rect x="2" y="1" width="8" height="1" class="fill-gold" />
            <rect x="1" y="2" width="10" height="7" class="fill-gold" />
            <rect x="3" y="4" width="2" height="2" class="fill-bg" />
            <rect x="7" y="4" width="2" height="2" class="fill-bg" />
            <rect x="4" y="7" width="4" height="1" class="fill-bg" />
            <rect x="2" y="9" width="2" height="2" class="fill-gold" />
            <rect x="8" y="9" width="2" height="2" class="fill-gold" />
        </svg>
        <div class="flex flex-col gap-0.5 font-mono text-xs">
            <span class="text-gold">AI_ASSIST · idle</span>
            <span class="text-muted">按下對話：臨時素材 / 生成文章 / 回饋（尚未開放）</span>
        </div>
    </section>
</template>
