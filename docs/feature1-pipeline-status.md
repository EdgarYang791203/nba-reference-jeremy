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

---

## 2026-10-11 追加盤點：三項發現與優化方向

> 背景：本地（pglite + `LLM_PROVIDER=mock`）素材首頁每張卡標題相同；同日修了 Nuxt 4 升級後 `src/public` 404（`c489396`）與 CI `pnpm audit`（`40e6338`）。

### 發現 1：素材卡每篇標題相同 — mock 階段 B 固定輸出，不是資料問題

- **證據**：DB 20 篇的 `sourceUrl`、`keyQuotes` 各 20 種不同值；`titleZh`、`summaryZh` 只有 1 種（`llm/providers/mock-fixtures.ts` 的固定字串）。外電抓取為真，摘要為 mock。
- **優化（低成本，建議做）**：mock 階段 B 的 `titleZh` 改為「[mock] + 候選標題前 20 字」，`summaryZh` 帶入 snippet 前 100 字，讓本地畫面可辨識、不再誤判為資料壞掉。需同步檢查 `apps/web` 與 `apps/api` 用到固定字串的測試。
- 卡片右下「--」為瀏覽數佔位（schema 無 `views`），與此無關。

### 發現 2：Google News 連結無法擷取原文 — 影響真實摘要品質（最重要）

- **現況**：Google News RSS 的 `<link>` 是 `news.google.com/rss/articles/CBMi…` 編碼連結。它**不是 HTTP 302**，而是回一頁 Google News HTML 用 JavaScript 跳轉；RSS `<description>` 也只有標題 + 媒體名，`<source url>` 只有媒體網域。`sources/extract.ts` 用 `redirect: 'follow'` 拿到的是 Google 的殼頁，擷取不到正文，依 4.4 步驟 4 退回 RSS 摘要。
- **證據**：Google News 來源的 `keyQuotes` 內容就是「標題 + 媒體名」；只有 Yahoo Sports 直連的那篇有真實 `imageUrl`。本地網路無 proxy、無 SSL 阻擋（curl 測 Google News RSS 與 Yahoo 文章皆 200、憑證驗證通過），問題純粹在連結格式。
- **影響**：接真 API 後，Google News 來源（候選中的多數）的階段 B 只能依一行標題生成 → 摘要空泛、`keyQuotes` 子字串比對幾乎必定剔除、無圖片；階段 A 評分也只看得到標題。**在解決前，真 API 測試的品質結論不可信。**
- **優化方案**：

  | 方案 | 做法 | 優點 | 缺點 |
  |---|---|---|---|
  | A 解碼連結 | `CBMi…` 為 base64，舊格式直接含原始 URL；新格式需呼叫 Google 內部 `batchexecute` 端點取解碼參數 | 保留 Google News 覆蓋度 | 非官方、可能隨時失效，需 fallback 與快取 |
  | B 固定媒體 RSS 為主 | 擴充 `config.sources`（ESPN / CBS / HoopsHype / Yahoo 已有），Google News 候選標記 `extractable=false`，階段 A 排除或降權 | 穩定、有正文、有圖 | 覆蓋度依賴來源清單；The Athletic、NBA.com 等無公開 RSS |
  | C 混合（建議） | 先試 A 解碼；解碼或擷取失敗的 Google News 候選**不送階段 B**，只留作標題線索 | 兼顧覆蓋與品質 | 工時最高（約 0.5–1 天含測試） |

- **規格影響**：計畫書 4.4 步驟 4「失敗只用 RSS 摘要」需改為「無正文者不進階段 B」，**需 Hank 同意後改 md**。
- **配套**：`run_candidates` 新增 `extractStatus`（`ok` / `rss_only` / `failed`），讓 `runs` 與之後的 `/api/usage` 能看到擷取成功率。

### 發現 3：30 歲規則 — 已正確執行，優化重點在維護性

- **現況**：`services/players.ts` 以 `isEligible(birthDate, cutoff, config.minAge=30)` 過濾，`cutoff` 為賽季開打日（`config.seasonOpening` 預設 10/21；休賽季看下賽季），再扣 ban list。99 → 20 的篩選是在這份名單的外電上做（score ≥ 6、每人 ≤ 2、上限 20）。
- **優化**：
  1. `seed/players-2026.json` 為手動維護，上線前抽查 5 人 `birthDate` 與球隊；每季更新 `config.seasonOpening`。
  2. `GET /api/players` 回應加上本次適用的 `cutoff` 與人數，方便 Hank 核對名單。
  3. 補邊界測試：cutoff 當日生日視為滿 30（`>=`）；休賽季 6–9 月切換。
  4. 動態名單（M8）維持延後。

## 只做功能一的優先序（→ 部署 → 使用者測試）

**明確不做**：功能二（文章產生、模仿文筆）、功能三（Issue 對話）、M8 動態名單、Live2D、Usage 頁籤（D7）。

| 序 | 項目 | 為什麼排這裡 | 需要 Hank | 預估 |
|---|---|---|---|---|
| P0 | 合併 PR #1 | 已 CI 全綠，待手動 merge | 按合併 | — |
| P1 | 發現 2 方案 C + `extractStatus`；發現 1 的 mock 文案 | 決定真 API 測試結果是否有意義 | 同意 4.4 步驟 4 規格微調 | 0.5–1 天 |
| P2 | 用 dev key 本地跑一次真流程（`LLM_PROVIDER=anthropic` + pglite） | 驗證階段 A 分佈、階段 B 品質、keyQuotes 命中率、成本；調 prompt | 提供 dev workspace key（E1：$5 限額） | 0.5 天 |
| P3 | M4 最小集：A2 Access JWT、A3 Scheduler OIDC（正反例測試）、A5 origin header、A6 CORS 讀 config | 不做則部署後 `/jobs/*` 一律 401 | 提供 Cloudflare team domain、GCP project、SA email | 0.5–1 天 |
| P4 | 部署：Neon prod branch + Secret Manager（C1）、Cloud Run（E2）、Cloud Scheduler 05:00 與每 30 分鐘（M5、E6）、Cloudflare Pages（web）、Anthropic spend limit（E1）、GCP budget alert（E3） | 第一版先手動 `gcloud` 部署，GitHub Actions WIF（C4）延後 | GCP / Cloudflare / Neon 帳號操作 | 1 天 |
| P5 | 使用者測試 1–2 週 | 每日看 `runs`、`usage_log` 成本、擷取成功率；收摘要品質回饋 | 試用與回饋 | — |

**P1 排在 P2 之前的理由**：目前 Google News 候選佔多數，不先解連結問題，P2 跑出來的品質數據會低估整條 pipeline，也會浪費 dev key 額度。
**P4 的最小安全集**：素材頁本身公開不需 Access；A1 Access 只需保護 `/jobs/*` 以外的受保護路由，功能一階段可只設 Scheduler OIDC 與 origin header。

## 2026-10-11 P1 完成紀錄

- **Google News 連結還原**：新增 `apps/api/src/sources/googleNews.ts`（舊格式離線解碼；新格式 GET 殼頁取 `data-n-a-ts` / `data-n-a-sg` → POST batchexecute）。`config.googleNewsResolve=false` 可整個關閉（非官方介面失效時的開關）。
- **extractStatus**：`run_candidates.extract_status`（migration `0001`）。`failed` 者不進階段 A/B，標 `rejected / no_text`。`POST /jobs/daily` 回傳與 log 多了 `extract: { ok, rssOnly, failed }`。
- **來源名稱**：Google News 候選改用 RSS `<source>` 的媒體名（Yahoo Sports、ESPN…），不再顯示「Google News」。
- **階段 B prompt**：`<article>` 多帶 `title` 屬性（擷取正文通常不含標題）。
- **mock 文案**：`titleZh = [mock] + 原標題前 30 字`，`summaryZh` 前綴來源與原題，本地畫面可辨識。
- **規格同步**：計畫書 4.4 步驟 4 已補兩個子項。
- 測試：api `sources.test.ts` +5、`pipeline.test.ts` +1，全 workspace 144 綠。

### 本地真實 RSS 實測（mock LLM，2026-10-11）

| 項目 | 數字 |
|---|---|
| 候選（30+ 名單、36h、去重後） | 175 |
| 擷取到正文 ok | 136 |
| 僅 RSS 摘要可用 rss_only | 2 |
| 無可用文字 failed（不進階段 A/B） | 37 |
| Google News 還原失敗 | 0 |
| 入庫素材 | 20（標題 20 種、19 篇有圖、20 篇有引述） |

37 篇 failed 全是媒體站擋機器人／付費牆導致正文擷取失敗、摘要又只有標題，依新規則正確剔除。
對照 9/29 實測：當時 Google News 來源幾乎全部只剩標題。

**P2 前置已就緒**：切 `LLM_PROVIDER=anthropic` + dev key 即可在本地跑真實階段 A/B。
