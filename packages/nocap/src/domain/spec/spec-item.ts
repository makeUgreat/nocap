import { Location } from '../shared/location.js'
import type { SpecId } from './spec-id.js'
import type { InvalidTag, InvalidTagReason } from './invalid-tag.js'
import type { SpecComment } from './spec-comment.boundary.js'
import { type NotTag, Tag } from './tag.js'

type ValidSpecItem = { readonly kind: 'valid'; readonly item: SpecItem }

export class SpecItem {
  private constructor(
    readonly id: SpecId,
    readonly location: Location,
    readonly text: string,
  ) {}

  static parse(path: string, comment: SpecComment): NotTag | InvalidTag | ValidSpecItem {
    const result = Tag.parse(comment.body)
    if (result.kind === 'not-tag') return result

    const { placement } = comment
    switch (placement.kind) {
      case 'first-block':
        return invalid({ kind: 'no-sentence' }, path, comment)
      case 'elsewhere-in-item':
        return invalid({ kind: 'not-at-item-end' }, path, comment)
      case 'outside-item':
        return invalid({ kind: 'outside-list-item' }, path, comment)
      case 'first-paragraph-end':
        if (result.kind !== 'valid') {
          return invalid(result, path, comment)
        }

        return { kind: 'valid', item: new SpecItem(result.tag.id, Location.of(path, placement.itemLine), placement.text) }
    }
  }
}

function invalid(reason: InvalidTagReason, path: string, comment: SpecComment): InvalidTag {
  return { ...reason, location: Location.of(path, comment.line) }
}
