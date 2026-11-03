import { SpecItem, type SpecInvalidTag } from './spec-item.js'
import type { SpecTagSite } from './spec-tag-site.boundary.js'

export class SpecDocument {
  private constructor(
    readonly specItems: readonly SpecItem[],
    readonly invalidTags: readonly SpecInvalidTag[],
  ) {}

  static of(path: string, sites: readonly SpecTagSite[]): SpecDocument {
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
