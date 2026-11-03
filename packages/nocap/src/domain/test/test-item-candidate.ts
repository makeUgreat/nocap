import type { TagCandidate } from '../shared/tag-candidate.js'
import type { TestName } from './test-name.js'

/**
 * A test call that has a comment at its tag position.
 *
 * @remarks
 * The tag position is the line just above the test call, with no code before the comment on that line.
 * A test call without such a comment is not a candidate.
 */
export type TestItemCandidate = {
  /** 1-based line where the test call starts. */
  readonly line: number
  readonly name: TestName
  readonly tagCandidate: TagCandidate
}
