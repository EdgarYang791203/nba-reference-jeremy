# auth/

驗證 middleware（9C.1）：

- `verifyAccessJwt` — Cloudflare Access JWT（簽章、aud、iss、email 白名單）
- `verifySchedulerOidc` — Cloud Scheduler OIDC（Google 簽章、aud、SA email）
- `requireCloudflareOrigin` — 非 `/jobs/*` 請求需來自 Cloudflare（IP 段或共享 header）

正反例測試為必測清單（9C.7）。
