import type { TagSite } from '../shared/tag-site.js'
import { TestItem, type TestInvalidTag } from './test-item.js'
import type { TestName } from './test-name.js'

export class TestFile {
  private constructor(
    readonly items: readonly TestItem[],
    readonly invalidTags: readonly TestInvalidTag[],
  ) {}

  static of(path: string, sites: readonly TagSite<TestName>[]): TestFile {
    const items: TestItem[] = []
    const invalidTags: TestInvalidTag[] = []
    for (const site of sites) {
      const result = TestItem.parse(path, site)
      switch (result.kind) {
        case 'not-tag':
          break
        case 'valid':
          items.push(result.item)
          break
        default:
          invalidTags.push(result)
      }
    }
    return new TestFile(items, invalidTags)
  }
}
