import { CommentsAboveTestUnit } from './comments-above-test-unit.js'
import type { TestComment } from './test-comment.boundary.js'
import type { InvalidTag } from '../spec/invalid-tag.js'
import { TestItem } from './test-item.js'
import type { TestUnit } from './test-unit.boundary.js'

export class TestFile {
  private constructor(
    readonly testItems: readonly TestItem[],
    readonly invalidTags: readonly InvalidTag[],
  ) {}

  static of(path: string, comments: readonly TestComment[], testUnits: readonly TestUnit[]): TestFile {
    const { found, misplaced } = CommentsAboveTestUnit.collect(comments, testUnits)
    const items: TestItem[] = []
    const invalidTags: InvalidTag[] = []
    for (const run of found) {
      const { item, invalidTags: runInvalidTags } = TestItem.parse(path, run)
      if (item !== undefined) items.push(item)
      invalidTags.push(...runInvalidTags)
    }
    for (const comment of misplaced) {
      const result = TestItem.misplaced(path, comment)
      if (result.kind !== 'not-tag') invalidTags.push(result)
    }
    return new TestFile(items, inLineOrder(invalidTags))
  }
}

function inLineOrder(invalidTags: readonly InvalidTag[]): InvalidTag[] {
  return [...invalidTags].sort((a, b) => a.location.line - b.location.line)
}
