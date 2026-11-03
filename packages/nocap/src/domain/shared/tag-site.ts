/**
 * An item that has a comment at its tag position. The comment body is not checked yet.
 *
 * @remarks
 * The adapter of each format decides the tag position with the syntax of that format.
 * In a spec document it is the end of the first paragraph of a list item.
 * In a test file it is the line just above a test call, with no code before the comment on that line.
 * An item without such a comment is not a tag site.
 * The adapter does not check the body: a comment such as `TODO` still makes a tag site.
 * Whether the body is a tag is decided by `Tag.parse`.
 *
 * @typeParam Subject - What the item is: the spec sentence of a list item, or the name of a test call.
 */
export type TagSite<Subject> = {
  /** 1-based line where the item starts. */
  readonly line: number
  readonly subject: Subject
  readonly comment: {
    /** 1-based line where the comment starts. */
    readonly line: number
    /** Text between the comment delimiters, for example between `<!--` and `-->`. Whitespace is kept as written. */
    readonly body: string
  }
}
