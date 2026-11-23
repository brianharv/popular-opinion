import { z } from 'zod'
import { pointOptions, roundOptions } from './match-options'

export const nameSchema = z.string().trim().min(1).max(24)
const answer = z.string().trim().min(1).max(160)
export const formatSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('rounds'), rounds: z.literal(roundOptions) }),
  z.object({ type: z.literal('points'), target: z.literal(pointOptions) }),
])
export type MatchFormat = z.infer<typeof formatSchema>
const startSchema = z.object({ type: z.literal('start'), phase: z.literal('lobby'), format: formatSchema })
const turnActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('answer'), phase: z.literal('answering'), text: answer }),
  z.object({ type: z.literal('support'), phase: z.literal('response') }),
  z.object({ type: z.literal('challenge'), phase: z.literal('response'), text: answer }),
  z.object({ type: z.literal('vote'), phase: z.literal('voting'), answerId: z.uuid() }),
])
export const actionSchema = z.union([startSchema, turnActionSchema.and(z.object({ turnId: z.uuid() }))])
export type Action = z.infer<typeof startSchema> | z.infer<typeof turnActionSchema>
export type MatchOutcome = { type: 'winner' | 'shared-tie' | 'tiebreaker'; playerIds: string[] }
export type Phase = Action['phase'] | 'buffer' | 'scoring' | 'complete'
export type Player = { id: string; name: string }
export type Entry = { id: string; authorId: string; text: string }
export type Modifier = { name: string; rule: string }
export type Result = {
  missed: boolean
  awards: Record<string, number>
  votes: Record<string, string>
  totals: Record<string, number>
  entries: Entry[]
  modifier?: Modifier
}
export type RoomView = {
  code: string
  you: string
  players: Player[]
  hostId: string
  phase: Phase
  deadline?: number
  serverTime: number
  turnId?: string
  match?: {
    format: MatchFormat
    turnNumber: number
    scores: Record<string, number>
    outcome?: MatchOutcome
  }
  answeringId?: string
  bannerUntil?: number
  prompt?: string
  modifier?: Modifier
  entries: Entry[]
  accepted?: Action
  vote?: string
  result?: Result
}
export type Credential = { code: string; token: string }
export type ServerMessage = { view: RoomView } | { error: string }
