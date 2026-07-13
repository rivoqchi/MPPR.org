# MPPR Frontend

Enterprise real-time frontend for **MPPR tizimi**, built with React 19, TypeScript, Vite, and Ant Design v5.

## Tech stack

- React 19 + TypeScript (strict)
- Vite
- Ant Design v5 + `@ant-design/icons`
- TanStack Query — server state
- Zustand — client/UI state
- React Router v7 — routing with lazy loading
- Axios — HTTP client with interceptors
- Socket.io-client — real-time
- React Hook Form + Zod — forms & validation
- dayjs — date/time
- i18next — uz / ru / en
- Vitest + Testing Library
- ESLint + Prettier + Husky + lint-staged

## Project structure (FSD)

```
src/
├── app/          # providers, router, global styles
├── features/     # business features
├── entities/     # domain entities
├── shared/       # api, lib, hooks, types, stores
└── widgets/      # composite UI blocks
```

## Requirements

- Node.js 20+
- pnpm 9+

## Getting started

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.development

# Start dev server
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). You should see the Ant Design layout, theme switcher, and **MPPR tizimiga xush kelibsiz**.

`npm run dev` also works if you prefer npm.

## Scripts

| Command           | Description                |
| ----------------- | -------------------------- |
| `pnpm dev`        | Start development server   |
| `pnpm build`      | Production build           |
| `pnpm preview`    | Preview production build   |
| `pnpm lint`       | Run ESLint                 |
| `pnpm format`     | Format with Prettier       |
| `pnpm test`       | Run tests in watch mode    |
| `pnpm test:run`   | Run tests once             |

## Environment variables

| Variable         | Description              | Example                        |
| ---------------- | ------------------------ | ------------------------------ |
| `VITE_API_URL`   | REST API base URL        | `http://localhost:3000/api`    |
| `VITE_WS_URL`    | WebSocket URL            | `ws://localhost:3000`          |
| `VITE_APP_NAME`  | Application name         | `MPPR tizimi`                  |
| `VITE_APP_ENV`   | Environment label        | `development`                  |

## Path alias

`@/` maps to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`).

## Loading states (mandatory)

All loading UI **must** use Ant Design `Skeleton` — never `Spin`, `Button loading`, `Table loading`, or custom spinners.

| Use case        | Component                                      |
| --------------- | ---------------------------------------------- |
| Route / page    | `RouteFallback`, `PageSkeleton`                |
| React Query     | `QuerySkeleton` + `CardSkeleton` / etc.        |
| Table           | `TableSkeleton`                                |
| Form            | `FormSkeleton`                                 |

Shared skeletons live in `src/shared/ui/skeleton/`. See `.cursor/rules/antd-skeleton-loading.mdc`.

## Ant Design size (mandatory)

All Ant Design components use **`large`** size. Configured globally via `ConfigProvider componentSize="large"` in `AntdProvider`. Never use `small` or `middle`. See `.cursor/rules/antd-large-size.mdc`.
