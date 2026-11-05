import type { Location } from '../shared/location.js'
import type { InvalidIdCandidate, SpecId } from './spec-id.js'

/**
 * Layer 1, tag vocabulary: the text after "nocap:" broke a rule.
 *
 * @remarks
 * `missing-id`: "nocap:" has nothing after it.
 * `multiple-ids`: splitting the text after "nocap:" by commas gives two or more non-empty values. A tag takes one id.
 * `id-rule-violation`: the text after "nocap:" broke the id rule.
 */
export type VocabularyReason =
  | { readonly kind: 'missing-id' }
  | { readonly kind: 'multiple-ids'; readonly values: readonly [string, string, ...string[]] }
  | { readonly kind: 'id-rule-violation'; readonly invalidCandidate: InvalidIdCandidate }

/**
 * Layer 2, tag form: the comment that holds the tag is of the wrong form.
 *
 * @remarks
 * `block-comment`: a block comment has a line that starts with "nocap:". Test tags are `//` comments only.
 */
export type FormReason = { readonly kind: 'block-comment' }

/**
 * Layer 3, tag position: the tag is not where it can be attached.
 *
 * @remarks
 * `no-sentence`, `not-at-item-end`, `outside-list-item`: a spec tag is not at the end of the first paragraph of a list item.
 * `after-code`, `not-above-test-call`: a test tag is in no comment run above a test unit.
 * `repeated-id`: the comment run has an earlier test tag with the same id, at `firstTagLine`.
 */
export type PositionReason =
  | { readonly kind: 'no-sentence' | 'not-at-item-end' | 'outside-list-item' }
  | { readonly kind: 'after-code' | 'not-above-test-call' }
  | { readonly kind: 'repeated-id'; readonly id: SpecId; readonly firstTagLine: number }

/** Why a comment that has "nocap:" did not become a spec tag or a test tag. One tag has one reason. */
export type InvalidTagReason = VocabularyReason | FormReason | PositionReason

/** A tag that broke a rule, at the line where the tag starts. No spec item or test item takes an id from it. */
export type InvalidTag = InvalidTagReason & { readonly location: Location }
