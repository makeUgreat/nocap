/**
 * A comment that an adapter found in a spec document or a test file. The body is not checked yet.
 *
 * @remarks
 * The adapter finds comments with the syntax of its format.
 * Whether the body is a tag is decided by `Tag.parse`.
 * `line` is the 1-based line where the comment starts.
 * `body` is the text between the comment delimiters, for example between `<!--` and `-->`. Whitespace is kept as written.
 */
export type SourceComment = {
  readonly line: number
  readonly body: string
}
