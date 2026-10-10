# 功能一：每日外電排程 — 實作狀態盤點

> 盤點日期：2026-09-29（develop `e09fd9e`）。
> 對照文件：`nba-material-site-plan.md` 第 4 章（4.2 業務規則、4.4 每日排程流程、4.5.1 Haiku 呼叫）與第 9 章里程碑。
> 本文只記錄現況，不改規格；規格以計畫書為準。

## 一句話結論

**抓外電是真的，中文摘要在本地開發時是 mock，排程觸發還沒接。**
只要設 `LLM_PROVIDER=anthropic` 加 dev key，整條流程就會打真實 Anthropic API，程式碼不用改。

## 資料流（實際實作）

```
Cloud Scheduler（M5 未接，目前手動 POST）
   │
   ▼
POST /jobs/daily                                  apps/api/src/services/pipeline/daily.ts
 1. runs[date] 冪等檢查（done / collecting / failed 不重跑；卡住超過 staleRunMinutes 才重跑）
 2. 取 30+ 名單，扣 ban list                        services/players.ts, repos/banlist.ts
 3. 每位球員 Google News RSS + 固定 RSS               sources/rss.ts, sources/candidates.ts
    → 英文、近 freshnessHours(36h)、URL/標題去重
 4. 抓原文：article-extractor → readability fallback   sources/extract.ts（重試 ≤ 2，並發 5）
    → 失敗只用 RSS 摘要
    → 候選落 run_candidates
 5. 階段 A：Haiku 同步評分（壞 JSON 重試 1 次 → 規則式 fallback）
                                                    pipeline/stageA.ts, llm/prompts/stageA.ts
    → selectCandidates：score ≥ 6、每球員 ≤ 2、總數 ≤ dailyLimit(20)
                                                    packages/shared/src/domain/candidates.ts
    → 雙重驗證 #1（名單 + ban）
 6. 階段 B：Batch API 送出，runs.status = collecting  pipeline/stageB.ts, llm/prompts/stageB.ts
   │
   ▼
POST /jobs/daily/collect（Scheduler 每 30 分鐘，M5 未接）
                                                    apps/api/src/services/pipeline/collect.ts
 7. Batch 未 ended → 仍 collecting；超過 batchTimeoutHours(24h) → cancel + failed
    Batch ended → 每筆：zod 驗證 → keyQuotes 子字串比對 → 雙重驗證 #2
                                                    pipeline/verify.ts
    → 單一 transaction 寫 materials / run_candidates / runs.done
    → usage_log（從 Batch result 取 tokens，Batch 費率）
```

「翻譯摘要」發生在步驟 6 的 Batch 內，由 Haiku 產出 `titleZh / summaryZh(300–500 字) / keyQuotes[] / tags[]`。
後端本地只負責抓網頁、驗證與寫 DB，沒有任何本地模型。計畫書 4.1 明定「整篇翻譯」不在範圍，輸出是客觀轉述的摘要。

## 逐項狀態

| 計畫書項目 | 狀態 | 備註 |
|---|---|---|
| 4.2 dailyLimit = 20、每球員 ≤ 2、score < 6 不取 | ✅ 真實 | `packages/shared` 純函式，`config` 表可調 |
| 4.2 雙重驗證（生成前、寫入前） | ✅ 真實 | daily 步驟 5 與 collect 步驟 7 各一次 |
| 4.2 冪等（runs.date 狀態機） | ✅ 真實 | 另有 crash 重跑：`staleRunMinutes` |
| 4.4 步驟 3 Google News RSS + 固定 RSS | ✅ 真實 | 固定來源在 `config.sources`，預設 ESPN / CBS / HoopsHype / Yahoo |
| 4.4 步驟 3 英文 / 36h / 去重 | ✅ 真實 | 英文判斷用標題 ASCII 比例（有 TODO） |
| 4.4 步驟 4 原文擷取 + fallback + 重試 ≤ 2 | ✅ 真實 | 不用 headless browser |
| 4.5.1 階段 A 同步評分、分批 ≤ 150、重試 → fallback | ✅ 邏輯真實 | 本地 `LLM_PROVIDER=mock` 時回固定分數 |
| 4.5.1 階段 B Batch、`<article>` 包裹、忽略指令聲明 | ✅ 邏輯真實 | 本地 mock 回固定摘要，Batch 送出即完成 |
| 4.5.1 collect 驗證鏈（zod → keyQuotes → 名單） | ✅ 真實 | |
| 4.5.1 Batch 24h 逾時 → failed、同日不重送 | ✅ 真實 | |
| 4.5.1 usage_log + BudgetGuard | ✅ 真實 | 每次 LLM 呼叫必經 guarded client |
| Anthropic provider（Messages + Batches API） | ✅ 已寫 | `llm/providers/anthropic.ts`，system prompt 有 `cache_control` |
| **實際用 Anthropic key 跑過完整流程** | ❌ 未做 | prompt 輸出品質尚未驗證 |
| Cloud Scheduler 每日 05:00 / 每 30 分鐘觸發 | ❌ M5 | 目前只能手動 POST |
| Scheduler OIDC 驗證 | ❌ M4 stub | production 一律 401，部署後排程打不進來 |
| 4.4 步驟 8「整個 run 設 total timeout」 | ⚠️ 差異 | 實作為 `staleRunMinutes` + Batch 24h，無單次 run 總 timeout |

## 已有的實測紀錄

commit `ca589c8`：seed 15 人 → `POST /jobs/daily`（**真實 RSS** 99 候選 → 20 選取）→ `/collect` 20 篇入庫 → `/materials` 顯示。
該次 RSS 與原文擷取為真，階段 A / B 為 mock。

## 本地重現

```bash
# apps/api
DATABASE_URL=pglite://./.data/dev
LLM_PROVIDER=mock            # 換 anthropic + ANTHROPIC_API_KEY（dev key）即打真 API
pnpm seed
curl -X POST http://localhost:8787/jobs/daily
curl -X POST http://localhost:8787/jobs/daily/collect
```

## 待討論（程式碼內 TODO）

- `sources/candidates.ts`：Google News 連結為轉址 URL，目前直接以轉址 URL 去重與擷取。
- `sources/candidates.ts`：英文判斷改用語言偵測套件。
- `routes/public.ts`：`/materials` pageSize 固定 20。
- 計畫書 4.4 步驟 8 total timeout 是否需要補，或改 md 改為現行做法。

## 下一步建議（依里程碑順序）

1. **M4**：Scheduler OIDC 與 Access JWT 驗證落地，否則部署後 `/jobs/*` 打不進。
2. **用 dev key 跑一次真實完整流程**，檢查階段 A 評分分佈與階段 B 摘要品質、keyQuotes 命中率，調 prompt。
3. **M5**：Cloud Scheduler 兩條 job 接上，Cloud Run 環境變數設 `LLM_PROVIDER=anthropic`。
