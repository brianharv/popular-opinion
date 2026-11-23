import { createApp } from './app'
import { localDatabase } from './storage'

const dev = process.argv.includes('--dev')
const app = await createApp(process.env.DATABASE_URL ?? localDatabase, undefined, !dev)
await app.listen({ host: dev ? '127.0.0.1' : process.env.HOST ?? '127.0.0.1', port: Number(process.env.PORT ?? (dev ? 3181 : 3180)) })
console.log(app.listeningOrigin)
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close() })
