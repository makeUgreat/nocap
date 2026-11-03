import type { NotTag } from '../shared/id-candidates.js'
import { Location } from '../shared/location.js'
import type { TagSite } from '../shared/tag-site.js'
import { SpecIds } from '../spec/spec-ids.js'
import { type InvalidTagReason, Tag } from '../spec/tag.js'

/** A test tag that broke a rule, at the line of the tag. */
export type TestInvalidTag = InvalidTagReason & { readonly location: Location }

/** The comment of the tag site is a valid test tag, so the test call became a test item. */
type ValidTestItem = { readonly kind: 'valid'; readonly item: TestItem }

export class TestItem {
  private constructor(
    readonly ids: SpecIds,
    readonly location: Location,
  ) {}

  static parse(path: string, site: TagSite): NotTag | TestInvalidTag | ValidTestItem {
    const result = Tag.parse(site.comment.body)

    switch (result.kind) {
      case 'not-tag':
        return result
      case 'missing-id':
      case 'id-rule-violation':
        return invalid(result, path, site.comment)
      case 'valid':
        return TestItem.fromTag(result.tag, path, site)
    }
  }

  private static fromTag(tag: Tag, path: string, { line }: TagSite): ValidTestItem {
    return { kind: 'valid', item: new TestItem(SpecIds.of(tag.ids), Location.of(path, line)) }
  }
}

function invalid(reason: InvalidTagReason, path: string, comment: TagSite['comment']): TestInvalidTag {
  return { ...reason, location: Location.of(path, comment.line) }
}
