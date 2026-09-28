# services/

業務邏輯層；routes 只驗證與呼叫這裡，repos 只做 Drizzle 存取。

- `config.ts` — DEFAULT_CONFIG ⊕ DB `config` rows → zod → 60s 快取（9C.4 D3）；killSwitch 由此讀（D4）
- `budget.ts` — BudgetGuard：daily 全站 + 互動週/月上限，killSwitch 一律拒（D2）。**12.4：不得修改或繞過**
- `players.ts` — 30+ 名單（賽季基準日 + ban list）
- `banlist.ts` / `materials.ts` — 4.7 受保護操作與 4.6 查詢
- `pipeline/daily.ts` — 每日排程：冪等 → 抓外電 → 階段 A → 選取 → 雙重驗證 #1 → Batch 送出（4.4 步驟 1–6）
- `pipeline/collect.ts` — 輪詢 Batch → 驗證鏈 → 單一 transaction 入庫（步驟 7–8；逾時 24h → failed）
- `pipeline/stageA.ts` / `stageB.ts` / `verify.ts` — 評分呼叫與 fallback、Batch 請求組裝、zod + keyQuotes + 名單驗證
- `errors.ts` — AppError 家族 → app.onError 對應 HTTP 狀態
