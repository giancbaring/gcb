/**
 * timestamp.ts — implementation of the `timestamp` primitive.
 * Contract: core/primitives/timestamp.yaml
 *
 * A Timestamp is an instant on the UTC timeline, stored as milliseconds
 * since the Unix epoch. It carries no timezone, no locale, no calendar.
 * Those are presentation concerns handled above this primitive.
 */

declare const timestampBrand: unique symbol

export type Timestamp = number & { readonly [timestampBrand]: true }

/** A duration in milliseconds. Kept distinct from a Timestamp by branding. */
declare const durationBrand: unique symbol
export type Duration = number & { readonly [durationBrand]: true }

/** Construct a Timestamp from a known instant in milliseconds. */
export function fromMillis(ms: number): Timestamp {
  return ms as Timestamp
}

/** Construct a Duration from milliseconds. */
export function duration(ms: number): Duration {
  return ms as Duration
}

/** Read the current instant. The only function that consults the clock. */
export function now(): Timestamp {
  return Date.now() as Timestamp
}

/** Extract milliseconds for interop with Date, JSON, databases. */
export function toMillis(t: Timestamp): number {
  return t
}

/** Compare two instants. Total and stable. */
export function isAfter(a: Timestamp, b: Timestamp): boolean {
  return a > b
}

export function isBefore(a: Timestamp, b: Timestamp): boolean {
  return a < b
}

export function isEqual(a: Timestamp, b: Timestamp): boolean {
  return a === b
}

/** Add a Duration to a Timestamp. Returns a new Timestamp. */
export function add(t: Timestamp, d: Duration): Timestamp {
  return (t + d) as Timestamp
}

/** Subtract a Duration from a Timestamp. Returns a new Timestamp. */
export function subtract(t: Timestamp, d: Duration): Timestamp {
  return (t - d) as Timestamp
}

/** Signed difference between two instants, as a Duration. */
export function diff(a: Timestamp, b: Timestamp): Duration {
  return (a - b) as Duration
}
