# NBA 素材庫網站

「阿准的隨看隨想」NBA 素材庫。規格 SSOT：`docs/nba-material-site-plan.md`，開發規則見 `CLAUDE.md`。

## 結構

```
apps/web         Nuxt 3 前端（Cloudflare Pages, ISR）
apps/api         Hono 後端（Docker → Cloud Run）
packages/shared  Drizzle schema、zod schema、純函式（年齡、篩選、上限）
docs/            規格文件
```

## 開發

需求：Node 20+、pnpm 10+（`corepack enable`）。

```bash
pnpm install
cp .env.example .env   # 填入 Neon dev branch 與 dev key
pnpm dev               # 同時起 Nuxt (3000) + Hono (8787)
pnpm test              # Vitest 全 workspace
pnpm lint
```

## Key 輪替 SOP（9C.3 C6）

1. Secret Manager 建立新版本 secret（`ANTHROPIC_API_KEY` / `DATABASE_URL`）。
2. 重新部署 Cloud Run（`--set-secrets` 指向 latest）。
3. 確認服務正常後，到 Anthropic Console / Neon 撤銷舊 key。
4. 程式零改動——只讀環境變數。

## Commit 規範

`feat: / fix: / docs: / style: / refactor: / perf: / test: / build: / chore:` + 半形空格 + 描述（commit-msg hook 會擋）。
