import type { SourceComment } from '../shared/source-comment.boundary.js'

/**
 * Where an HTML comment of a spec document sits in the Markdown tree.
 *
 * @remarks
 * `first-paragraph-end`: the comment is the last node of the first paragraph of a list item.
 * `itemLine` is the 1-based line where the list item starts.
 * `text` is the spec sentence: the first paragraph of the list item without the comment, on one line.
 * `first-block`: the comment is the whole first block of a list item, so the list item has no spec sentence.
 * `elsewhere-in-item`: the comment is in a list item, but at no place above.
 * `outside-item`: the comment is in no list item.
 */
export type SpecCommentPlacement =
  | { readonly kind: 'first-paragraph-end'; readonly itemLine: number; readonly text: string }
  | { readonly kind: 'first-block' }
  | { readonly kind: 'elsewhere-in-item' }
  | { readonly kind: 'outside-item' }

/** An HTML comment of a spec document with its placement. Comments in code are not spec comments. */
export type SpecComment = SourceComment & { readonly placement: SpecCommentPlacement }
