# Asset Shop — Frontend

Single page application built with **React**, **TypeScript**, and **Vite**.

## Stack

| Technology | Purpose |
|---|---|
| React 18 | UI component library |
| TypeScript | Static typing |
| Vite | Dev server, bundler, and build tool |
| React DOM | Mounts React into the browser DOM |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite dev server on port 5173 with hot module replacement (HMR) |
| `npm run build` | Type-checks with `tsc` then bundles the app for production into `dist/` |
| `npm run preview` | Serves the production build locally to test before deploying |

## API Proxy

In development, requests to `/api/*` are proxied to `http://localhost:3000` by Vite.
This avoids CORS issues without any backend configuration.

| Frontend call | Forwarded to |
|---|---|
| `/api/health` | `http://localhost:3000/health` |

## File Structure

```
client/
├── src/
│   ├── components/
│   │   └── HealthStatus.tsx    # Health check component
│   ├── types/
│   │   └── api.ts              # Shared API response types
│   ├── main.tsx                # Entry point — mounts the React app into index.html
│   └── App.tsx                 # Root component
├── index.html                  # Single HTML file, entry point for Vite
├── vite.config.ts              # Vite config — React plugin, dev server port, API proxy
├── package.json
└── tsconfig.json
```
