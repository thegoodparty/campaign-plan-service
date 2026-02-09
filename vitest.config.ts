import dotenv from 'dotenv'
import { readFileSync } from 'fs'
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
    include: ['src/**/*.test.ts'],
    env: dotenv.parse(readFileSync(`${__dirname}/.env.test`)),
    clearMocks: true,
  },
})
