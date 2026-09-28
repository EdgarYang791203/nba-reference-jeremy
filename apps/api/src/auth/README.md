# auth/

驗證 middleware（9C.1）。**目前為 M4 前的 stub：production 一律 401，其他環境放行並設 actor。**

- `access.ts` — `requireAccess`：TODO(M4) Cloudflare Access JWT（簽章、aud、iss、email 白名單）
- `scheduler.ts` — `requireScheduler`：TODO(M4) Cloud Scheduler OIDC（Google 簽章、aud、SA email）
- TODO(M4) `requireCloudflareOrigin`：非 `/jobs/*` 請求需來自 Cloudflare（IP 段或共享 header）

正反例測試為必測清單（9C.7）。
