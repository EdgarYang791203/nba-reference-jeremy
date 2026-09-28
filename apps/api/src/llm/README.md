# llm/

Anthropic 呼叫封裝（4.5.1）。

- `types.ts` — provider 介面（complete / submitBatch / getBatch / getBatchResults / cancelBatch）
- `providers/mock.ts` — 決定性 mock：測試與無 key 本地開發；`providers/anthropic.ts` — Messages + Batches，system 標 cache_control
- `guarded.ts` — 每次呼叫先過 BudgetGuard + killSwitch，完成後寫 `usage_log`（9C.4 D1）。**12.4：不得繞過**
- `prompts/stageA.ts` / `stageB.ts` — 篩選評分與摘要 prompt；外部文章以 `<article>` 包住並明示忽略指令（9C.2 B3）
- `json.ts` — 模型輸出的寬鬆 JSON 解析

provider 選擇（`index.ts`）：`LLM_PROVIDER=anthropic` 且有 `ANTHROPIC_API_KEY` 才用真實 API；本地一律 dev key。
