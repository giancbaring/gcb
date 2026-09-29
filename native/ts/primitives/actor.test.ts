/**
 * actor.test.ts — tests for the `actor` primitive.
 */

import { describe, it, expect } from 'vitest'
import { isOk, isErr } from './result'
import { unsafeIdentifier } from './identifier'
import { makeSubject } from './subject'
import { ACTOR_VIA, makeActor, isActorVia, allActorVia } from './actor'

function adminSubject() {
  return makeSubject(unsafeIdentifier('GMS001'), 'human', { role: 'ADMIN' })
}

function officerSubject() {
  return makeSubject(unsafeIdentifier('GMS042'), 'human', { role: 'OFFICER' })
}

describe('actor — construction', () => {
  it('accepts a direct actor with default via', () => {
    const r = makeActor({ subject: adminSubject() })
    expect(isOk(r)).toBe(true)
    if (r.ok) {
      expect(r.value.via).toBe(ACTOR_VIA.DIRECT)
      expect(r.value.onBehalfOf).toBeUndefined()
    }
  })

  it('accepts a delegated actor with both subjects', () => {
    const r = makeActor({
      subject: adminSubject(),
      onBehalfOf: officerSubject(),
      via: ACTOR_VIA.DELEGATED,
    })
    expect(isOk(r)).toBe(true)
    if (r.ok) {
      expect(r.value.via).toBe(ACTOR_VIA.DELEGATED)
      expect(r.value.onBehalfOf?.identifier).toBe('GMS042')
    }
  })

  it('accepts a system actor', () => {
    const r = makeActor({
      subject: makeSubject(unsafeIdentifier('SYSTEM'), 'system'),
      via: ACTOR_VIA.SYSTEM,
    })
    expect(isOk(r)).toBe(true)
  })

  it('rejects a missing subject', () => {
    const r = makeActor({ subject: null })
    expect(isErr(r)).toBe(true)
  })

  it('rejects an unknown via', () => {
    const r = makeActor({ subject: adminSubject(), via: 'telepathy' })
    expect(isErr(r)).toBe(true)
  })

  it('rejects direct actor with onBehalfOf set', () => {
    const r = makeActor({
      subject: adminSubject(),
      onBehalfOf: officerSubject(),
      via: ACTOR_VIA.DIRECT,
    })
    expect(isErr(r)).toBe(true)
    if (!r.ok) expect(r.error).toContain('must not carry onBehalfOf')
  })

  it('rejects delegated actor without onBehalfOf', () => {
    const r = makeActor({
      subject: adminSubject(),
      via: ACTOR_VIA.DELEGATED,
    })
    expect(isErr(r)).toBe(true)
    if (!r.ok) expect(r.error).toContain('requires onBehalfOf')
  })

  it('rejects delegated actor with malformed onBehalfOf', () => {
    const r = makeActor({
      subject: adminSubject(),
      onBehalfOf: { not: 'a subject' },
      via: ACTOR_VIA.DELEGATED,
    })
    expect(isErr(r)).toBe(true)
  })

  it('the actor itself is frozen', () => {
    const r = makeActor({ subject: adminSubject() })
    expect(isOk(r) && Object.isFrozen(r.value)).toBe(true)
  })
})

describe('actor — via guard', () => {
  it('accepts every declared mode', () => {
    for (const v of allActorVia()) {
      expect(isActorVia(v)).toBe(true)
    }
  })

  it('rejects unknown strings', () => {
    expect(isActorVia('impersonate')).toBe(false)
    expect(isActorVia('')).toBe(false)
    expect(isActorVia(42)).toBe(false)
    expect(isActorVia(null)).toBe(false)
  })

  it('allActorVia returns a frozen array', () => {
    expect(Object.isFrozen(allActorVia())).toBe(true)
  })

  it('contains exactly three modes', () => {
    expect(allActorVia().length).toBe(3)
  })
})
