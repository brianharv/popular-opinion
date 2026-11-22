import { createApp } from './app'
import { localDatabase } from './storage'

const app = await createApp(process.env.DATABASE_URL ?? localDatabase, undefined, true)
await app.listen({ host: process.env.HOST ?? '127.0.0.1', port: Number(process.env.PORT ?? 3180) })
console.log(app.listeningOrigin)
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close() })
