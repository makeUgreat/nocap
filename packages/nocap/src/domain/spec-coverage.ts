import type { SpecItem } from './spec-item.js'
import type { TestItem } from './test-item.js'

export interface SpecCoverage {
  readonly specItem: SpecItem
  readonly testItems: readonly TestItem[]
}
