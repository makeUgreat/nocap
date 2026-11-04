import type { SpecTagSite } from '../../domain/spec/spec-tag-site.boundary.js'

export interface SpecDocumentParser {
  /**
   * Finds the tag sites of the list items in one spec document.
   *
   * @param content - Full text of the spec document.
   * @returns The tag sites in the order they appear in the document. Empty when the document has none.
   * The text of each tag site is the spec sentence: the first paragraph of the list item without the comment, on one line.
   */
  parse(content: string): SpecTagSite[]
}
