import type { SpecComment } from './spec-comment.boundary.js'
import type { InvalidTag } from './invalid-tag.js'
import { SpecItem } from './spec-item.js'

export class SpecDocument {
  private constructor(
    readonly specItems: readonly SpecItem[],
    readonly invalidTags: readonly InvalidTag[],
  ) {}

  static of(path: string, comments: readonly SpecComment[]): SpecDocument {
    const specItems: SpecItem[] = []
    const invalidTags: InvalidTag[] = []
    for (const comment of comments) {
      const result = SpecItem.parse(path, comment)
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
