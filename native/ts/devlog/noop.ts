import type { Historian } from './types'

export const noopHistorian: Historian = {
  enter(_contract, _detail) {},
  step(_contract, _name, _detail) {},
  note(_contract, _detail) {},
  fail(_contract, _detail) {},
  exit(_contract, _detail) {},
}