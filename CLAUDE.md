# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案

「阿准的隨看隨想」NBA 素材庫網站。**SSOT 是 `docs/nba-material-site-plan.md`**，動工前先讀全文；任何與該文件衝突的實作決定，先在 PR 說明提出，不要靜默改規格；要改規格請同步改 md。

三大功能：素材頁（每日排程抓 30+ 球員外電生成中文摘要卡）、待發佈文章頁、Issue 頁（Claude API 對話框）。依里程碑（計畫書第 9 章）逐步實作，目前進度（2026-09-28）：**里程碑 1 完成；里程碑 2–3 主體完成（PR #1，develop → master）**；M4 的 Access / OIDC 驗證為 stub（production 一律 401）。UI tokens 以 Design System `tokens.json`（AI Console 琥珀）為準，取代 9D.2 舊色票。

## 已定案技術棧（計畫書第 2 章）

- **Monorepo**：pnpm workspaces — `apps/web`（Nuxt 4）、`apps/api`（Hono + TypeScript）、`packages/shared`（Drizzle schema、zod schema、純函式）
- **前端**：Nuxt 4（2026-09-29 由 Nuxt 3 升級，`srcDir: src` 不走 `app/`）+ Tailwind + **Element Plus**（2026-09-28 定案；依 9D.5 覆蓋 CSS 變數：圓角 0、gold 主色、panel 底色），部署 Cloudflare Pages（ISR）
- **後端**：Hono，Docker → Cloud Run（min 0 / max 1）；DB 為 Neon Postgres + Drizzle ORM
- **測試**：Vitest 全 workspace 統一（`vitest.workspace.ts` 於根目錄，`pnpm test` 全跑）+ Playwright 兩條 smoke
- **登入**：Cloudflare Access（Google IdP，email 白名單）；排程：Cloud Scheduler OIDC → `/jobs/*`
- Node 20+、pnpm（不用 npm）

## 常用指令（骨架建好後應成立）

```bash
pnpm dev          # 同時起 Nuxt (3000) + Hono (8787)
pnpm test         # Vitest 全 workspace（api 用 pglite 真 SQL）
pnpm lint         # ESLint（lint:fix 才會改檔）
pnpm typecheck    # tsc（api/shared）+ nuxt typecheck（web），CI 必跑
pnpm audit --audit-level high   # CI 必跑
pnpm seed         # seed/players-2026.json → players（需 DATABASE_URL）
```

本地無 Neon 時：在 `apps/api` 用 `DATABASE_URL=pglite://./.data/dev`（啟動自動 migrate）+ `LLM_PROVIDER=mock`，
`pnpm seed` → `POST /jobs/daily` → `POST /jobs/daily/collect` 即可在 `/materials` 看到真資料。
前端不接 API 時用 `NUXT_PUBLIC_USE_MOCK_API=true`。

## 本次環境建置範圍（2026-09-28 與 Hank 討論定案）

1. **完整 monorepo 骨架**（里程碑 1）：`pnpm-workspace.yaml`、`apps/web`、`apps/api`、`packages/shared`、`vitest.workspace.ts`、`.env.example`、gitleaks pre-commit、CI。第一個 commit 只含骨架與 CI，能 `pnpm test` 全綠。
2. 建在本 repo（`EdgarYang791203/nba-reference-jeremy`）根目錄，`docs/` 保留。
3. 只做**架構與共用組件**，不實作業務功能、不呼叫任何 Claude API。

## 參考專案：`c:\dev\fbcom-frontend-web`

架構與工程慣例以此專案為藍本（Nuxt 3 + TS + Pinia），但**不採用**它的 CMS catch-all 動態路由（`[...dynamics].vue`）——本站是固定路由（`/materials`、`/articles`、`/issues`）。

### 沿用的分層慣例（apps/web/src 下）

```
apis/          # http client 封裝、API 型別
components/    # common/（共用）、layout/、icons/
composables/
constants/
layouts/
middleware/
pages/         # 固定路由，不用 catch-all
plugins/
stores/        # Pinia
types/
utils/
```

### 從 fbcom 搬移的清單（定案）

- **utils 通用函式**：`sanitizeHtml`、`formatText`、`scrollLock`、`linkHelpers`、`createPromiseWithResolvers` 等純邏輯，去掉富邦專屬部分（navTreeBuilder、productFilters、b6O2OPayload 等不搬）。
- **composables**：`useMediaQuery`、`useDeviceType`、`usePagination`、`useIntersectionObserver` 等通用者（useNavTree、useTemplateCategoryNav 等 CMS 專屬不搬）。
- **通用組件改造成 RPG 風**：`AppLink`、`BaseImage`、`Pagination`、`Accordion`、`GlobalDialog`、`GlobalLoading`、`Loading`、`Breadcrumb` — 搬骨架與邏輯，視覺全部換成 9D tokens。
- 搬移時逐檔檢視，移除富邦 API / mock / siteMode 相依。

### 沿用的工程紀律

- 所有 v-html 一律走 `sanitizeHtml()`；不寫 inline `style=""`（動態值用 ref + `el.style.xxx` 在 client 設定）。
- 前端 HTTP 一律經 `composables/useApi()`（axios 層 + envelope + 全域 loading/error）；後端回傳統一 `{ ok, data } | { ok:false, error }`。
- 後端分層：routes 只驗證（zod）與呼叫 services；services 不直接下 query；Drizzle 只在 repos；每個 Claude 呼叫必經 guarded client（BudgetGuard + usage_log）。
- ESLint + Prettier + husky + lint-staged pre-commit。
- Commit message 規範：`feat: / fix: / docs: / style: / refactor: / perf: / test: / build: / chore:` + 半形空格 + 描述。

## UI Style（計畫書 9D）

暗版「RPG 狀態視窗」風：色彩 tokens（`--c-bg`、`--c-panel`、`--c-gold` 等）以 CSS 變數定義在 `:root[data-theme]`，Tailwind `theme.extend.colors` 對應；`darkMode: 'class'`；圓角全域 0；硬陰影不模糊；像素字只用於 ≥16px 標題與數值，內文 Noto Sans TC。自製組件：Window、StatBar、StatRow、Tag、Button、Tab、Card、Marquee（規格見 9D.4）。Element Plus 覆蓋備註見 9D.5。像素素材載入規則見 9E.3，Live2D 見 9F。

## 後端分層（apps/api，計畫書 3.2）

- `routes/` 只做驗證與呼叫 service；`services/` 業務邏輯；`repos/` 所有 Drizzle 存取集中於此；`llm/` Anthropic 封裝與 prompt；`sources/` RSS 與擷取；`auth/` Access JWT 與 Scheduler OIDC 驗證。

## 開工規則（計畫書第 11 章）

1. 每個里程碑一個分支、一個 PR；PR 描述列出對應計畫書章節（例：`feat(api): 4.4 daily pipeline`），並附「假設清單」與「未做事項」。
2. 測試優先順序：`packages/shared` 純函式 → `BudgetGuard` → 排程冪等 → Access/OIDC 驗證正反例 → 前端元件。
3. 秘密與費用：本地一律用 dev key 與 Neon dev branch。
4. UI 實作以 Design 畫布為準（暗版 AI Console 琥珀為預設主題）。

## 禁止事項（計畫書 12.4，不可協商）

- 呼叫正式 Anthropic key（未經 Hank 確認）。
- 修改或繞過 `BudgetGuard`、Access/OIDC 驗證邏輯。
- 刪除或跳過測試。
- 把 secret 寫進 repo（`.env` 進 `.gitignore`，只放 `.env.example`）。
- 熱連第三方 CDN（含 Live2D 模型，一律自託管）。
- 未經 Hank 同意改動 md 規格（要改先在 PR 提出）。

## 進一步閱讀

| 想做的事 | 看哪份 |
|---|---|
| 全部規格、資料模型、排程流程、預算 | `docs/nba-material-site-plan.md` |
| UI tokens 與元件規格 | 計畫書 9D；Design 畫布「NBA 素材站 Design System」 |
| 參考架構與共用模組原始碼 | `c:\dev\fbcom-frontend-web`（`docs/shared-modules-guide.md`、`docs/components-guide.md`） |
