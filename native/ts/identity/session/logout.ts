/**
 * logout.ts — implementation of the `logout` composition.
 * Contract: core/identity/session/logout.yaml
 *
 * Terminates an active session by returning a revoked copy. The caller
 * is responsible for persisting the new state and recording an auth
 * event. This composition has no failure mode.
 */

import type { Session } from '../primitives/session'
import { revoke } from '../primitives/session'

export function logout(session: Session): Session {
  return revoke(session)
}
