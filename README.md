# TactDo – Full-stack GraphQL To-Do (Tactlink Software Engineer Test)

A to-do app with email/password auth, built as two clients of one GraphQL API (React web and React Native mobile).

```
software-engineer-test/
├── backend/   Node.js + Apollo Server (GraphQL) — local file DB, DynamoDB on AWS Lambda
├── web/       React (Vite) + Apollo Client + Tailwind CSS — deployed on Vercel
└── mobile/    React Native (Expo) + Apollo Client + React Navigation — offline cache
```

| Deliverable              | Link                                                                  |
| ------------------------ | --------------------------------------------------------------------- |
| GitHub repository        | https://github.com/miwaaatin/tactdo                                   |
| Web app (Vercel)         | `https://tactdo.vercel.app`                                           |
| GraphQL API (AWS Lambda) | `https://0gt67lknw3.execute-api.ap-southeast-1.amazonaws.com/graphql` |

---

## 1. Backend

### Run locally

```bash
cd backend
npm install
npm run dev            # http://localhost:4000  (Apollo Sandbox in the browser)
node scripts/smoke.js  # end-to-end test: signup → login → CRUD → auth check
```

Data is persisted to `backend/db.json`.

### API

```graphql
type Query    { me: User, todos: [Todo!]!, todo(id: ID!): Todo }
type Mutation {
  signup(email, password): AuthPayload!     login(email, password): AuthPayload!
  createTodo(title): Todo!                  updateTodo(id, title, completed): Todo!
  deleteTodo(id): ID!
}
```

Send `Authorization: Bearer <token>` for to-do operations.

### Deploy to AWS (Lambda + API Gateway + DynamoDB)

```bash
cd backend
# credentials: run aws configure once (or use AWS credential environment variables)
$env:JWT_SECRET="<long-random-string>"        # PowerShell  (bash: export JWT_SECRET=...)
npx serverless@3 deploy --stage prod
node scripts/smoke.js https://0gt67lknw3.execute-api.ap-southeast-1.amazonaws.com/graphql
```

Deployed to `ap-southeast-1` (Singapore) on 26 October 2026. Live smoke test passed signup, login, create/update/list/delete, and unauthenticated rejection. Lambda runs Node.js 22 with DynamoDB persistence.

See [docs/AWS_DEPLOYMENT.md](docs/AWS_DEPLOYMENT.md) for architecture, redeployment instructions (reuse the existing JWT secret), and cost.

## 2. Web

```bash
cd web
npm install
cp .env.example .env    # set VITE_GRAPHQL_URL
npm run dev             # http://localhost:5173
```

**Vercel:** import the repo → Root Directory `web` → Framework _Vite_ → env var `VITE_GRAPHQL_URL=<AWS URL>` → Deploy.
(or CLI: `cd web && npx vercel --prod`)

## 3. Mobile

```bash
cd mobile
npm install
# Phone can't reach "localhost" — use your PC's LAN IP or the AWS URL:
$env:EXPO_PUBLIC_GRAPHQL_URL="https://0gt67lknw3.execute-api.ap-southeast-1.amazonaws.com/graphql"
npx expo start --max-workers 1   # scan QR with Expo Go
```

---

For Expo Go on iOS, sign in to Expo CLI and Expo Go with the same Expo account. If browser login does not complete, run `npx expo login --no-browser` in the terminal. Cached tasks can be viewed offline; offline writes are not queued for later sync.

## Architecture decisions

- **One schema, two clients.** Both clients share the same GraphQL operations and Apollo Client
  normalized cache patterns (fragment `TodoFields`, cache `update`/`evict` after mutations).
- **Auth:** "dummy" but realistic — bcrypt-hashed passwords + JWT (7-day) in the `Authorization`
  header. Every to-do resolver derives `userId` from the token, so data is strictly user-scoped
  (a user can never read/modify another user's to-dos even with a known id).
- **Pluggable storage.** `store.js` exposes one async interface with two implementations:
  JSON file (zero-setup local dev, as suggested) and DynamoDB (Lambda's filesystem is ephemeral,
  so file storage would lose data). Selected by `TABLE_NAME` env var.
- **DynamoDB single-table design:** `USER#email` (login lookup, conditional put enforces unique
  email), `USERID#id` (profile), `USERID#userId / TODO#id` (one `Query` lists a user's to-dos).
- **Serverless on AWS:** Lambda + HTTP API + on-demand DynamoDB — scales to zero, low cost at test-traffic levels, deployed with one command via Serverless Framework.
- **Optimistic UI:** toggle/delete render instantly using `optimisticResponse`.
- **Mobile offline support (bonus):** `apollo3-cache-persist` writes the Apollo cache to
  AsyncStorage; with `cache-and-network`, cached to-dos show instantly and while offline.
- **Web:** Tailwind CSS v4 (bonus), responsive layout, protected routes with React Router,
  `vercel.json` SPA rewrite so deep links work.

## Time taken (estimated)

| Part      | Time           |
| --------- | -------------- |
| Backend   | ~1.2 hours     |
| Mobile    | ~1.6 hours     |
| Web       | ~1.2 hours     |
| Cloud     | ~0.8 hours     |
| **Total** | **~4.8 hours** |

These are approximate effort estimates, not a measured time log.
