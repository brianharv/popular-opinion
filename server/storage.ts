import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import type { Match } from './match'
import type { Player, Result } from '../shared/protocol'
import type { PersonaId } from '../shared/personas'

export type Seat = Player & { tokenHash: string }
export type Checkpoint = {
  hostId: string
  seats: Seat[]
  result?: Result
  ended?: boolean
  remainingPrompts?: string[]
  remainingPersonas?: PersonaId[]
} & (
  | { match: Match; answeringId?: never }
  | { match?: never; answeringId: string }
)

export async function openStorage(url: string) {
  const db = new Kysely<{ opinion_matches: { code: string; checkpoint: string } }>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString: url }) }),
  })
  try {
    await db.schema.createTable('opinion_matches').ifNotExists()
      .addColumn('code', 'text', column => column.primaryKey())
      .addColumn('checkpoint', 'text', column => column.notNull()).execute()
  } catch (error) {
    await db.destroy()
    throw error
  }
  return {
    load: async () => (await db.selectFrom('opinion_matches').selectAll().execute())
      .map(row => ({ code: row.code, checkpoint: JSON.parse(row.checkpoint) as Checkpoint })),
    start: async (code: string, checkpoint: Checkpoint) => {
      await db.insertInto('opinion_matches').values({ code, checkpoint: JSON.stringify(checkpoint) }).execute()
    },
    commit: async (code: string, before: Checkpoint, after: Checkpoint) => {
      const previous = JSON.stringify(before)
      const next = JSON.stringify(after)
      const updated = await db.updateTable('opinion_matches').set({ checkpoint: next })
        .where('code', '=', code).where('checkpoint', '=', previous).executeTakeFirst()
      if (updated.numUpdatedRows === 0n) {
        const row = await db.selectFrom('opinion_matches').select('checkpoint').where('code', '=', code).executeTakeFirst()
        if (row?.checkpoint !== next) throw new Error('Match checkpoint changed.')
      }
    },
    close: () => db.destroy(),
  }
}

export const localDatabase = 'postgres://opinion:opinion@127.0.0.1:54329/opinion'
