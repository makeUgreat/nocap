import type { SourceComment } from '../shared/source-comment.boundary.js'

/**
 * A comment of a test file. The body is not checked yet. Comments in strings are not test comments.
 *
 * @remarks
 * `endLine` is the 1-based line where the comment ends.
 * `style` is `line` for a comment that runs to the end of the line, such as `//`,
 * and `block` for a comment between delimiters that can span lines.
 * `hasCodeOnLine` is true when code is on one of the lines the comment spans.
 */
export type TestComment = SourceComment & {
  readonly endLine: number
  readonly style: 'line' | 'block'
  readonly hasCodeOnLine: boolean
}
