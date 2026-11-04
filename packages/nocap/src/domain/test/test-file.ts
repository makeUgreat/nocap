import { TestItem, type TestInvalidTag } from './test-item.js'
import type { TestItemCandidate } from './test-item-candidate.js'

export class TestFile {
  private constructor(
    readonly items: readonly TestItem[],
    readonly invalidTags: readonly TestInvalidTag[],
  ) {}

  static of(path: string, candidates: readonly TestItemCandidate[]): TestFile {
    const items: TestItem[] = []
    const invalidTags: TestInvalidTag[] = []
    for (const candidate of candidates) {
      const result = TestItem.parse(path, candidate)
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
