# llm/

Anthropic 呼叫封裝（4.5.1）：prompt、zod 驗證、`usage_log` 記錄（9C.4 D1）。

- 禁止：本地使用正式 key；繞過 BudgetGuard / killSwitch。
- 外部文章一律包 `<article>` 標籤 + 忽略指令聲明（9C.2 B3）。
- 里程碑 2 前不得實作任何實際 API 呼叫。
