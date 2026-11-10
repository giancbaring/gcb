/**
 * actor.ts — implementation of the `actor` primitive.
 * Contract: core/primitives/actor.yaml
 *
 * An Actor is the entity that performed an action. It is distinct from
 * a Subject, which is the entity an action is about. When delegation
 * occurs, both are recorded.
 */

import { ok, err, type Result } from '../../primitives/result'
import type { Subject } from '../../primitives/subject'

export const ACTOR_VIA = {
  DIRECT: 'direct',
  DELEGATED: 'delegated',
  SYSTEM: 'system',
} as const

export type ActorVia = (typeof ACTOR_VIA)[keyof typeof ACTOR_VIA]

const ALL_VIA: readonly ActorVia[] = Object.freeze([
  ACTOR_VIA.DIRECT,
  ACTOR_VIA.DELEGATED,
  ACTOR_VIA.SYSTEM,
])

export interface Actor {
  readonly subject: Subject
  readonly onBehalfOf: Subject | undefined
  readonly via: ActorVia
}

export interface ActorInput {
  readonly subject: unknown
  readonly onBehalfOf?: unknown
  readonly via?: unknown
}

function isSubjectLike(value: unknown): value is Subject {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.identifier === 'string' && typeof v.kind === 'string'
}

export function isActorVia(value: unknown): value is ActorVia {
  return typeof value === 'string' && (ALL_VIA as readonly string[]).includes(value)
}

export function makeActor(input: ActorInput): Result<Actor, string> {
  if (!isSubjectLike(input.subject)) {
    return err('actor: subject is missing or malformed')
  }

  const via: ActorVia =
    input.via === undefined ? ACTOR_VIA.DIRECT : (input.via as ActorVia)

  if (!isActorVia(via)) {
    return err(`actor: unknown via '${String(input.via)}'`)
  }

  const hasOnBehalfOf = input.onBehalfOf !== undefined && input.onBehalfOf !== null

  if (via === ACTOR_VIA.DELEGATED) {
    if (!hasOnBehalfOf) {
      return err('actor: via=delegated requires onBehalfOf')
    }
    if (!isSubjectLike(input.onBehalfOf)) {
      return err('actor: onBehalfOf is malformed')
    }
    return ok(
      Object.freeze({
        subject: input.subject,
        onBehalfOf: input.onBehalfOf,
        via,
      }),
    )
  }

  if (hasOnBehalfOf) {
    return err(`actor: via=${via} must not carry onBehalfOf`)
  }

  return ok(
    Object.freeze({
      subject: input.subject,
      onBehalfOf: undefined,
      via,
    }),
  )
}

export function allActorVia(): readonly ActorVia[] {
  return ALL_VIA
}
