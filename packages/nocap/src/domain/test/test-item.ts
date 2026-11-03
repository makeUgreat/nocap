import type { NotTag } from '../shared/id-candidates.js'
import { Location } from '../shared/location.js'
import type { TagCandidate } from '../shared/tag-candidate.js'
import { SpecIds } from '../spec/spec-ids.js'
import { type InvalidTagReason, Tag } from '../spec/tag.js'
import type { TestItemCandidate } from './test-item-candidate.js'
import type { TestName } from './test-name.js'

/** A test tag that broke a rule, at the line of the tag. */
export type TestInvalidTag = InvalidTagReason & { readonly location: Location }

/** The candidate has a valid test tag and became a test item. */
type ValidTestItem = { readonly kind: 'valid'; readonly item: TestItem }

export class TestItem {
  private constructor(
    readonly ids: SpecIds,
    readonly location: Location,
    readonly name: TestName,
  ) {}

  static parse(path: string, candidate: TestItemCandidate): NotTag | TestInvalidTag | ValidTestItem {
    const result = Tag.parse(candidate.tagCandidate.body)

    switch (result.kind) {
      case 'not-tag':
        return result
      case 'missing-id':
      case 'id-rule-violation':
        return invalid(result, path, candidate.tagCandidate)
      case 'valid':
        return TestItem.fromTag(result.tag, path, candidate)
    }
  }

  private static fromTag(tag: Tag, path: string, { line, name }: TestItemCandidate): ValidTestItem {
    return { kind: 'valid', item: new TestItem(SpecIds.of(tag.ids), Location.of(path, line), name) }
  }
}

function invalid(reason: InvalidTagReason, path: string, tagCandidate: TagCandidate): TestInvalidTag {
  return { ...reason, location: Location.of(path, tagCandidate.line) }
}
