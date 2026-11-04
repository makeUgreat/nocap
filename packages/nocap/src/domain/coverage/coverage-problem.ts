import type { SpecId } from '../spec/spec-id.js'
import type { SpecItem } from '../spec/spec-item.js'
import type { TestItem } from '../test/test-item.js'

/** A spec item whose id no other spec item has, and that no test item points to. */
export type UncoveredSpec = { readonly kind: 'uncovered-spec'; readonly specItem: SpecItem }

/** An id that test items point to, but that no spec item has. */
export type UnknownId = {
  readonly kind: 'unknown-id'
  readonly id: SpecId
  /** The test items that point to the id, in the order they were given. */
  readonly testItems: readonly [TestItem, ...TestItem[]]
}

/** An id that two or more spec items have. Coverage does not judge whether these spec items are covered. */
export type DuplicateId = {
  readonly kind: 'duplicate-id'
  readonly id: SpecId
  /** The spec items that have the id, in the order they were given. */
  readonly specItems: readonly [SpecItem, SpecItem, ...SpecItem[]]
}

/** A place where the link between spec items and test items is broken. */
export type CoverageProblem = UncoveredSpec | UnknownId | DuplicateId
