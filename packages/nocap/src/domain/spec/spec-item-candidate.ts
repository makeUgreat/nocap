import type { TagCandidate } from '../shared/tag-candidate.js'

/**
 * A list item in a spec document that has a comment at its tag position.
 *
 * @remarks
 * The tag position is the end of the first paragraph of the list item.
 * A comment anywhere else, or inside code, does not make a candidate.
 * A list item without such a comment is not a candidate.
 */
export type SpecItemCandidate = {
  /** 1-based line where the list item starts. */
  readonly line: number
  /** The first paragraph without the comment, on one line. Empty when the paragraph has only the comment. */
  readonly text: string
  readonly tagCandidate: TagCandidate
}
