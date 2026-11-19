// Bundles each Lambda handler into a single ESM file with its dependencies inlined.
// Lambda only needs this one file (zipped) — no node_modules upload, smaller package,
// faster cold starts. Later, Terraform will zip dist/<name>/ and deploy it.
import { build } from 'esbuild';
import { readdirSync } from 'node:fs';

const handlers = readdirSync('src/handlers')
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  .map((f) => f.replace(/\.ts$/, ''));

await Promise.all(
  handlers.map((name) =>
    build({
      entryPoints: [`src/handlers/${name}.ts`],
      outfile: `dist/${name}/index.mjs`,
      bundle: true,
      platform: 'node',
      target: 'node24',
      format: 'esm',
      minify: true,
      sourcemap: true,
      // The AWS SDK v3 ships with the Lambda Node.js runtime, so don't bundle it.
      external: ['@aws-sdk/*'],
    }),
  ),
);

console.log(`Built ${handlers.length} handler(s): ${handlers.join(', ')}`);
