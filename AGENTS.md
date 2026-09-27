# AGENTS.md

本檔給 Jules 等非 Claude 的 coding agent 讀取。Claude Code 讀 `CLAUDE.md`。

## 開始任何任務前

1. 先讀 `CLAUDE.md` 全文，再讀 `docs/nba-material-site-plan.md` 全文。後者是唯一規格來源（SSOT）。
2. 你在本專案的預設角色是**獨立審查者**（計畫書第 12 章）：對規格 issue 或 PR 做對抗性審查，找矛盾、不可測的驗收條件、遺漏的失敗情境與邊界案例。
3. 審查結果一律寫成檔案，放在 `docs/reviews/`，檔名依觸發 issue 的指示（例：`spec-review-r2.md`、`pr-12.md`），完成後開 PR。除該檔案外不要修改任何其他檔案，不要寫程式碼，除非 issue 明確要求實作。

## 審查檔案格式

每個審查項目包含：對象（issue 編號或檔案與行號）、反駁論點或問題、建議修改（可直接貼用的文字）、理由、嚴重度（`阻斷` 或 `建議`）。

## 禁止事項（與 CLAUDE.md 一致，不可協商）

- 呼叫任何 Anthropic API 或正式金鑰。
- 修改或繞過 `BudgetGuard`、Cloudflare Access / Scheduler OIDC 驗證邏輯。
- 刪除或跳過測試。
- 把 secret 寫進 repo。
- 熱連第三方 CDN。
- 修改 `docs/nba-material-site-plan.md` 或 `CLAUDE.md`；規格問題以審查檔案提出，由 Hank 決定。

## 專案技術棧摘要

pnpm workspaces monorepo：`apps/web`（Nuxt 3 + Tailwind + Element Plus）、`apps/api`（Hono + TypeScript，Drizzle + Neon Postgres）、`packages/shared`。Node 20+，只用 pnpm。測試 Vitest，`pnpm test` 全跑；lint 為 `pnpm lint`。
