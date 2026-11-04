/**
 * A comment at the tag position of an item candidate. Its body is not checked yet.
 *
 * @remarks
 * The adapter decides the tag position with the syntax of its own format.
 * The adapter does not check the body: a comment such as `TODO` is still a tag candidate.
 * Whether the body is a tag is decided by `Tag.parse`.
 */
export type TagCandidate = {
  /** 1-based line where the comment starts. */
  readonly line: number
  /** Text between the comment delimiters, for example between `<!--` and `-->`. Whitespace is kept as written. */
  readonly body: string
}
