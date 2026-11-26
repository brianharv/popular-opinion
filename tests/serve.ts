import { fixtureDraw } from '../server/game'
import { createApp } from '../server/app'
import { localDatabase } from '../server/storage'

const app = await createApp(process.env.TEST_DATABASE_URL ?? localDatabase,
  { 'turn-intro': 950, 'persona-preview': 950, answering: 5000, response: 5000, voting: 4500, 'duplicate-review': 1000, 'duplicate-result': 400, 'final-votes': 950, scoring: 5300 }, true, () => fixtureDraw().persona)
await app.listen({ host: '127.0.0.1', port: 3100 })
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close() })
