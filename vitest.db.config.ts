import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { include: ['server/**/*.db.ts'] } })
