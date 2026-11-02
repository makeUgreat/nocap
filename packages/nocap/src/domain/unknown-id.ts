import type { TestItem } from './test-item.js'

export interface UnknownId {
  readonly id: string
  readonly testItems: readonly TestItem[]
}
