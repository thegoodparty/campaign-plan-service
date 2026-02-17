import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import swc from 'unplugin-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: false,
  plugins: [
    swc.vite(),
    swc.rollup({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { decoratorMetadata: true },
      },
    }),
    tsconfigPaths(),
  ],
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json'],
    },
    include: ['src/**/*.test.ts', 'test/**/*.{test,spec}.ts'],
    env: dotenv.parse(
      readFileSync(fileURLToPath(new URL('./.env.test', import.meta.url))),
    ),
    clearMocks: true,
  },
})
