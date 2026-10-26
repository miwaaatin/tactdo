# TactDo web app

React + Vite + Apollo Client + Tailwind CSS.

Live app: https://tactdo.vercel.app

## Local development

```powershell
npm install
$env:VITE_GRAPHQL_URL="https://0gt67lknw3.execute-api.ap-southeast-1.amazonaws.com/graphql"
npm run dev
```

For a local backend, set VITE_GRAPHQL_URL to http://localhost:4000/ instead.

## Validation

```sh
npm run lint
npm run build
```

See the repository README for mobile setup, architecture, and AWS deployment instructions.