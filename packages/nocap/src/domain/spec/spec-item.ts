import type { NotTag } from '../shared/id-candidates.js'
import { Location } from '../shared/location.js'
import type { TagSite } from '../shared/tag-site.boundary.js'
import type { SpecId } from './spec-id.js'
import type { SpecTagSite } from './spec-tag-site.boundary.js'
import { type InvalidTagReason, Tag } from './tag.js'

/** A spec tag has two or more ids. Only spec tags have this reason. */
type MultipleIds = { readonly kind: 'multiple-ids'; readonly ids: readonly [SpecId, SpecId, ...SpecId[]] }

/** Why a comment body that starts with "nocap:" did not become a spec tag. */
type SpecInvalidTagReason = InvalidTagReason | MultipleIds

/** A spec tag that broke a rule, at the line where the tag starts. */
export type SpecInvalidTag = SpecInvalidTagReason & { readonly location: Location }

/** The comment of the tag site is a valid spec tag, so the list item became a spec item. */
type ValidSpecItem = { readonly kind: 'valid'; readonly item: SpecItem }

export class SpecItem {
  private constructor(
    readonly id: SpecId,
    readonly location: Location,
    readonly text: string,
  ) {}

  static parse(path: string, site: SpecTagSite): NotTag | SpecInvalidTag | ValidSpecItem {
    const result = Tag.parse(site.comment.body)

    switch (result.kind) {
      case 'not-tag':
        return result
      case 'missing-id':
      case 'id-rule-violation':
        return invalid(result, path, site.comment)
      case 'valid':
        return SpecItem.fromTag(result.tag, path, site)
    }
  }

  private static fromTag(tag: Tag, path: string, { line, text, comment }: SpecTagSite): SpecInvalidTag | ValidSpecItem {
    const [id, second, ...others] = tag.ids
    if (second) {
      return invalid({ kind: 'multiple-ids', ids: [id, second, ...others] }, path, comment)
    }
    return { kind: 'valid', item: new SpecItem(id, Location.of(path, line), text) }
  }
}

function invalid(reason: SpecInvalidTagReason, path: string, comment: TagSite['comment']): SpecInvalidTag {
  return { ...reason, location: Location.of(path, comment.line) }
}
