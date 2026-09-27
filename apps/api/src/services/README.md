# services/

業務邏輯層（pipeline、roster、materials、budget）。里程碑 2 起實作：

- `pipeline/` — 每日排程（4.4）：候選抓取 → 階段 A 篩選 → 階段 B Batch → collect
- `budget/` — BudgetGuard（9C.4 D2）：呼叫前檢查 daily / weekly / monthly 上限
- 純函式（年齡、篩選、上限）一律放 `packages/shared`，此層只做編排與 IO
