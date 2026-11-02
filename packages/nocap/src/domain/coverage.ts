import type { DuplicateId } from './duplicate-id.js'
import type { SpecCoverage } from './spec-coverage.js'
import type { UnknownId } from './unknown-id.js'

export interface Coverage {
  readonly specs: readonly SpecCoverage[]
  readonly unknownIds: readonly UnknownId[]
  readonly duplicateIds: readonly DuplicateId[]
}
