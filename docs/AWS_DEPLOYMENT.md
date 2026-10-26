# AWS Deployment

Live GraphQL endpoint: https://0gt67lknw3.execute-api.ap-southeast-1.amazonaws.com/graphql

Stack: `tactlink-todo-api-prod`; region: `ap-southeast-1` (Singapore). Deployed and smoke-tested on 26 October 2026.

## Architecture

```
Clients (Vercel web / Expo mobile)
          │ HTTPS POST /graphql  (Authorization: Bearer JWT)
          ▼
 API Gateway (HTTP API, CORS)  ──►  Lambda (Node 22, arm64, Apollo Server)
                                         │  IAM role: Get/Put/Delete/Query only
                                         ▼
                                  DynamoDB (on-demand, single table pk/sk)
                                  CloudWatch Logs
```

Everything is defined in `backend/serverless.yml` (CloudFormation under the hood), so the
stack is reproducible and removable with `npx serverless@3 remove --stage prod`.

## Steps
1. Create an IAM user with programmatic access (for a test account `AdministratorAccess` is
   simplest; scoped: CloudFormation, Lambda, API Gateway, DynamoDB, IAM role creation, S3, Logs).
2. Configure credentials once with `aws configure` (saved in `~/.aws/credentials`), then generate a JWT secret in the deployment shell:
   ```powershell
   $env:JWT_SECRET = node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. `cd backend && npx serverless@3 deploy --stage prod`
4. Copy the printed endpoint (`https://xxxx.execute-api.<region>.amazonaws.com/graphql`) and
   verify: `node scripts/smoke.js <endpoint>`
5. Set `VITE_GRAPHQL_URL` on Vercel and `EXPO_PUBLIC_GRAPHQL_URL` for mobile to this endpoint.


For later deployments, reuse the deployed secret so existing login tokens stay valid:
```powershell
$env:JWT_SECRET = aws lambda get-function-configuration --function-name tactlink-todo-api-prod-graphql --region ap-southeast-1 --query 'Environment.Variables.JWT_SECRET' --output text
npx serverless@3 deploy --stage prod --region ap-southeast-1
```
Keep this value out of logs and source control. Generating a new secret intentionally signs out existing users.

## Cost estimate (ap-southeast-1)
| Service | Assumption | Monthly |
|---|---|---|
| Lambda | 100k req, 512 MB, ~100 ms | $0 (free tier: 1M req + 400k GB-s) |
| API Gateway HTTP API | 100k req | ~$0.10 (free tier first 12 mo: 1M) |
| DynamoDB on-demand | 200k R/W, <1 GB | ~$0.30 (25 GB storage free) |
| CloudWatch Logs | <1 GB | ~$0 |
| **Total** | | **< $1 / month** |

At 10M requests/month the estimate is roughly $10 (API GW) + $2–4 (Lambda) + $5–15 (DynamoDB).

## Production hardening (not done for the test)
- Store `JWT_SECRET` in SSM Parameter Store / Secrets Manager
- Restrict CORS `allowedOrigins` to the Vercel domain
- Custom domain via ACM + API Gateway custom domain
- Rate limiting / WAF, provisioned concurrency to remove cold starts
