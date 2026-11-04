import type { NotTag } from '../shared/id-candidates.js'
import { Location } from '../shared/location.js'
import type { TagCandidate } from '../shared/tag-candidate.js'
import type { SpecId } from './spec-id.js'
import type { SpecItemCandidate } from './spec-item-candidate.js'
import { type InvalidTagReason, Tag } from './tag.js'

/** A spec tag has two or more ids. Only spec tags have this reason. */
type MultipleIds = { readonly kind: 'multiple-ids'; readonly ids: readonly [SpecId, SpecId, ...SpecId[]] }

/** Why a comment body that starts with "nocap:" did not become a spec tag. */
type SpecInvalidTagReason = InvalidTagReason | MultipleIds

/** A spec tag that broke a rule, at the line where the tag starts. */
export type SpecInvalidTag = SpecInvalidTagReason & { readonly location: Location }

/** The candidate has a valid spec tag and became a spec item. */
type ValidSpecItem = { readonly kind: 'valid'; readonly item: SpecItem }

export class SpecItem {
  private constructor(
    readonly id: SpecId,
    readonly location: Location,
    readonly text: string,
  ) {}

  static parse(path: string, candidate: SpecItemCandidate): NotTag | SpecInvalidTag | ValidSpecItem {
    const result = Tag.parse(candidate.tagCandidate.body)

    switch (result.kind) {
      case 'not-tag':
        return result
      case 'missing-id':
      case 'id-rule-violation':
        return invalid(result, path, candidate.tagCandidate)
      case 'valid':
        return SpecItem.fromTag(result.tag, path, candidate)
    }
  }

  private static fromTag(tag: Tag, path: string, { line, text, tagCandidate }: SpecItemCandidate): SpecInvalidTag | ValidSpecItem {
    const [id, second, ...others] = tag.ids
    if (second) {
      return invalid({ kind: 'multiple-ids', ids: [id, second, ...others] }, path, tagCandidate)
    }
    return { kind: 'valid', item: new SpecItem(id, Location.of(path, line), text) }
  }
}

function invalid(reason: SpecInvalidTagReason, path: string, tagCandidate: TagCandidate): SpecInvalidTag {
  return { ...reason, location: Location.of(path, tagCandidate.line) }
}
