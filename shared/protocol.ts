import { z } from 'zod'
import type { PersonaId } from './personas'
import { pointOptions, roundOptions } from './match-options'

export const nameSchema = z.string().trim().min(1).max(24)
const answer = z.string().trim().min(1).max(160)
export const formatSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('rounds'), rounds: z.literal(roundOptions) }),
  z.object({ type: z.literal('points'), target: z.literal(pointOptions) }),
])
export type MatchFormat = z.infer<typeof formatSchema>
const startSchema = z.object({ type: z.literal('start'), phase: z.literal('lobby'), format: formatSchema })
const endGameSchema = z.object({ type: z.literal('end-game'), confirmed: z.literal(true) })
const turnActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('answer'), phase: z.literal('answering'), text: answer }),
  z.object({ type: z.literal('support'), phase: z.literal('response') }),
  z.object({ type: z.literal('challenge'), phase: z.literal('response'), text: answer }),
  z.object({ type: z.literal('vote'), phase: z.literal('voting'), answerId: z.uuid() }),
  z.object({ type: z.literal('flag-duplicates'), phase: z.literal('voting'), answerIds: z.array(z.uuid()).min(2).max(11) }),
  z.object({ type: z.literal('vote-duplicates'), phase: z.literal('duplicate-review'), yes: z.boolean() }),
])
export const actionSchema = z.union([startSchema, endGameSchema, turnActionSchema.and(z.object({ turnId: z.uuid() }))])
export type Action = z.infer<typeof startSchema> | z.infer<typeof turnActionSchema>
export type MatchOutcome = { type: 'winner' | 'shared-tie' | 'tiebreaker'; playerIds: string[] }
export type Phase = Action['phase'] | 'turn-intro' | 'persona-preview' | 'duplicate-result' | 'final-votes' | 'scoring' | 'complete'
export type Player = { id: string; name: string }
export type Entry = { id: string; authorId: string; text: string; disqualified?: boolean }
export type Persona = { id?: PersonaId; name: string; subtitle?: string; rule: string }
export type Result = {
  missed: boolean
  awards: Record<string, number>
  bonusTurn?: boolean
  votes: Record<string, string>
  totals: Record<string, number>
  entries: Entry[]
  persona?: Persona
}
export type RoomView = {
  code: string
  you: string
  players: Player[]
  hostId: string
  phase: Phase
  allSeatsConnected?: boolean
  deadline?: number
  phaseDuration?: number
  serverTime: number
  turnId?: string
  match?: {
    format: MatchFormat
    turnNumber: number
    scheduledTurnNumber?: number
    isBonusTurn?: boolean
    scores: Record<string, number>
    outcome?: MatchOutcome
  }
  answeringId?: string
  previewWait?: { deadline: number; duration: number }
  prompt?: string
  persona?: Persona
  entries: Omit<Entry, 'authorId'>[]
  accepted?: Action
  vote?: string
  canFlagDuplicates?: boolean
  duplicateReview?: {
    eligible: boolean
    ballot?: boolean
    outcome?: { passed: boolean; yes: number; no: number }
  }
  voteReturned?: boolean
  result?: Result
}
export type Credential = { code: string; token: string }
export type ServerMessage = { view: RoomView } | { error: string } | { ended: true }
