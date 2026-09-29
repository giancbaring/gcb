/**
 * subject.ts — implementation of the `subject` primitive.
 * Contract: core/primitives/subject.yaml
 *
 * A Subject is the entity being identified or acted upon. It carries
 * an Identifier, a closed kind, and opaque descriptive attributes.
 * Attributes never grant authority — that is Principal's concern.
 */

import type { Identifier } from './identifier'

export type SubjectKind = 'human' | 'service' | 'device' | 'system'

const SUBJECT_KINDS: readonly SubjectKind[] = ['human', 'service', 'device', 'system']

export interface Subject {
  readonly identifier: Identifier
  readonly kind: SubjectKind
  readonly attributes: Readonly<Record<string, string>>
}

/**
 * Construct a Subject. Rejects unknown kinds at runtime as well as
 * compile time — a Subject from an untrusted source cannot smuggle
 * a new kind into the system.
 */
export function makeSubject(
  identifier: Identifier,
  kind: SubjectKind,
  attributes: Record<string, string> = {},
): Subject {
  if (!SUBJECT_KINDS.includes(kind)) {
    throw new Error(`unknown subject kind: ${String(kind)}`)
  }

  return Object.freeze({
    identifier,
    kind,
    attributes: Object.freeze({ ...attributes }),
  })
}

/** Structural equality: same identifier and same kind. */
export function subjectsEqual(a: Subject, b: Subject): boolean {
  return a.identifier === b.identifier && a.kind === b.kind
}

/** Type guard for the closed set. */
export function isSubjectKind(value: unknown): value is SubjectKind {
  return typeof value === 'string' && (SUBJECT_KINDS as readonly string[]).includes(value)
}
