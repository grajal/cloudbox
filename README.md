# CloudBox

A personal cloud file storage app (sign in, upload, organize, preview and share your files),
built on a serverless AWS architecture as a hands-on learning project after the
AWS Solutions Architect Associate exam.

## Stack

- **Frontend:** React + Vite SPA, Tailwind CSS (`apps/web`)
- **Backend:** TypeScript AWS Lambda handlers with Middy (`apps/api`), bundled with esbuild
- **Shared:** Zod schemas and types used by both sides (`packages/shared`)
- **Infrastructure:** Terraform (`infra/`), added incrementally
- **Tooling:** pnpm workspaces, Node 24, TypeScript 6, ESLint, Prettier, Vitest

## Getting started

```bash
corepack enable        # makes the pinned pnpm version available
pnpm install
pnpm dev               # web app at http://localhost:5173
pnpm test              # unit tests
pnpm build             # web build + Lambda bundles in apps/api/dist/<handler>/index.mjs
pnpm lint
```

## Roadmap

- [x] 0. Project scaffold
- [ ] 1. Auth: Cognito + first Terraform
- [ ] 2. Host the SPA on S3 + CloudFront (OAC)
- [ ] 3. API Gateway + first deployed Lambda
- [ ] 4. Folders & file metadata (DynamoDB)
- [ ] 5. Upload/download (S3 presigned URLs)
- [ ] 6. Storage quotas
- [ ] 7. Thumbnails (S3 events → EventBridge → SQS → Lambda)
- [ ] 8. Trash & versioning
- [ ] 9. Share links
- [ ] 10. Observability & cost alarms
