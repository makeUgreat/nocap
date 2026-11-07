import type { SpecComment } from '../../domain/spec/spec-comment.boundary.js'

/** Every HTML comment of one spec document in document order. Comments in code are not included. */
export type SpecDocumentParseResult = {
  readonly comments: readonly SpecComment[]
}

export interface SpecDocumentParser {
  /**
   * Finds the HTML comments of one spec document.
   *
   * @param content - Full text of the spec document.
   */
  parse(content: string): SpecDocumentParseResult
}
