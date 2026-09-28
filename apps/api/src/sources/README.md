# sources/

外電來源（4.4 步驟 3–4）。

- `rss.ts` — RSS 2.0 / Atom 解析（fast-xml-parser）、Google News 查詢 URL
- `extract.ts` — 原文擷取：article-extractor → readability + linkedom fallback → null；重試 ≤ 2、不用 headless browser
- `candidates.ts` — 每球員 Google News + 固定 RSS（config.sources）→ 英文 → 36h → URL/標題去重 → 並發擷取（失敗改用 RSS 摘要）
- `retry.ts` — 可注入 sleep 的重試

fetch 可注入（測試用 `tests/helpers/fetch.ts`）。TODO(討論): Google News 轉址連結解析策略。
