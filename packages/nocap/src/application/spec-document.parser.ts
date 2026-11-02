import type { SpecItem } from '../domain/spec-item.js'

export interface SpecDocumentParser {
  /**
   * Finds the spec items in one spec document.
   *
   * @param content - Full text of the spec document.
   * @returns Spec items in the order they appear in the document. Empty when the document has none.
   */
  parse(content: string): SpecItem[]
}
