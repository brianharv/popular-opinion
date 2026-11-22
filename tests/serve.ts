import { createApp } from '../server/app'
import { localDatabase } from '../server/storage'

const app = await createApp(process.env.TEST_DATABASE_URL ?? localDatabase,
  { answering: 5000, buffer: 800, response: 5000, voting: 4500, scoring: 1800 }, true)
await app.listen({ host: '127.0.0.1', port: 3100 })
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close() })
