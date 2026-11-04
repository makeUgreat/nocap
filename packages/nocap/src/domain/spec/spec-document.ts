import type { TagSite } from '../shared/tag-site.js'
import { SpecItem, type SpecInvalidTag } from './spec-item.js'

export class SpecDocument {
  private constructor(
    readonly specItems: readonly SpecItem[],
    readonly invalidTags: readonly SpecInvalidTag[],
  ) {}

  static of(path: string, sites: readonly TagSite<string>[]): SpecDocument {
    const specItems: SpecItem[] = []
    const invalidTags: SpecInvalidTag[] = []
    for (const site of sites) {
      const result = SpecItem.parse(path, site)
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
