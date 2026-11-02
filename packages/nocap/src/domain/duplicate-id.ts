import type { SpecItem } from './spec-item.js'

export interface DuplicateId {
  readonly id: string
  readonly specItems: readonly SpecItem[]
}
