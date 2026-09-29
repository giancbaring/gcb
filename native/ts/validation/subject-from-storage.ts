/**
 * subject-from-storage.ts — implementation of the `subject-from-storage`
 * function. Contract: core/validation/subject-from-storage.yaml
 *
 * Reconstruct a Subject from a raw storage record. Every field is
 * validated. The result is a fully-formed Subject or an error.
 *
 * Guards against a null or undefined record first — a value that is not
 * an object cannot carry fields to validate.
 */

import { ok, err, type Result } from '../primitives/result'
import {
  makeSubject,
  isSubjectKind,
  type Subject,
  type SubjectKind,
} from '../primitives/subject'
import type { Identifier } from '../primitives/identifier'

export interface SubjectStorageRecord {
  readonly identifier: unknown
  readonly kind: unknown
  readonly attributes?: unknown
}

function isIdentifierLike(value: unknown): value is Identifier {
  return typeof value === 'string' && value.length > 0
}

function isAttributeMap(value: unknown): value is Record<string, string> {
  if (value === undefined) return true
  if (typeof value !== 'object' || value === null) return false
  return Object.values(value as Record<string, unknown>).every(
    (v) => typeof v === 'string',
  )
}

export function subjectFromStorage(
  record: SubjectStorageRecord,
): Result<Subject, string> {
  if (typeof record !== 'object' || record === null) {
    return err('subject-from-storage: record is missing or not an object')
  }

  if (!isIdentifierLike(record.identifier)) {
    return err('subject-from-storage: identifier is missing or not a non-empty string')
  }

  if (!isSubjectKind(record.kind)) {
    return err(
      `subject-from-storage: kind is missing or unknown ('${String(record.kind)}')`,
    )
  }

  if (!isAttributeMap(record.attributes)) {
    return err('subject-from-storage: attributes must be a map of strings to strings')
  }

  const kind: SubjectKind = record.kind
  const attributes = (record.attributes as Record<string, string> | undefined) ?? {}

  return ok(makeSubject(record.identifier, kind, attributes))
}
