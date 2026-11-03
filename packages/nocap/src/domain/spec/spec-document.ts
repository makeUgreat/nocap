import { SpecItem, type SpecInvalidTag } from './spec-item.js'
import type { SpecItemCandidate } from './spec-item-candidate.js'

export class SpecDocument {
  private constructor(
    readonly specItems: readonly SpecItem[],
    readonly invalidTags: readonly SpecInvalidTag[],
  ) {}

  static of(path: string, candidates: readonly SpecItemCandidate[]): SpecDocument {
    const specItems: SpecItem[] = []
    const invalidTags: SpecInvalidTag[] = []
    for (const candidate of candidates) {
      const result = SpecItem.parse(path, candidate)
      switch (result.kind) {
        case 'not-tag':
          break
        case 'valid':
          specItems.push(result.item)
          break
        default:
          invalidTags.push(result)
      }
    }
    return new SpecDocument(specItems, invalidTags)
  }
}
