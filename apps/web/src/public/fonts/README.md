# fonts/

像素字型 subset 放置處（計畫書 9D.3）：

- 像素中文：Fusion Pixel 12px 或 Zpix（OFL），subset 後以 `@font-face` 載入，`font-display: swap`
- 英數：Press Start 2P（OFL）
- 內文 Noto Sans TC 建議同樣自託管 subset（不熱連第三方 CDN，12.4 禁令）

字型檔就位前，`font-pixel` / `font-press` 以 fallback 顯示。
