import type { SpecId } from '../spec/spec-id.js'
import type { SpecItem } from '../spec/spec-item.js'
import type { TestItem } from '../test/test-item.js'

export type UncoveredSpec = { readonly kind: 'uncovered-spec'; readonly specItem: SpecItem }

export type UnknownId = {
  readonly kind: 'unknown-id'
  readonly id: SpecId
  readonly testItems: readonly [TestItem, ...TestItem[]]
}

export type DuplicateId = {
  readonly kind: 'duplicate-id'
  readonly id: SpecId
  readonly specItems: readonly [SpecItem, SpecItem, ...SpecItem[]]
}

export type CoverageProblem = UncoveredSpec | UnknownId | DuplicateId
