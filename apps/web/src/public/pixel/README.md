# pixel/

像素素材（計畫書 9E），來源：Claude Design 畫布「NBA 素材站 · 素材列表頁」asset store。
載入規則見 9E.3：原生 `<img>` + `.pixel-asset`，不經 IPX 重採樣；Hero `fetchpriority="high"`，其餘 `loading="lazy"`。

| 檔名 | 用途 | 主題 |
|---|---|---|
| `arena-night-1440.jpg` / `arena-day-1440.jpg` | Hero 球場橫幅（16:9） | 夜 / 日 |
| `room-night-800.jpg` / `room-day-800.jpg` | 右欄場景視窗 CONTROL_ROOM.cam / PRESS_BOX.cam（4:3） | 夜 / 日 |
| `thumb-1..4-610.jpg` | 素材卡縮圖 fallback（16:9，輪替） | 共用 |
| `portrait-dark-280.png` / `portrait-light-280.png` | 狀態視窗通用球員頭像（非特定球員） | 暗 / 亮 |

生圖已依 9E.1 裁掉浮水印；不得出現真實商標。來源卡匣圖示（16×16 SVG）待實作。
