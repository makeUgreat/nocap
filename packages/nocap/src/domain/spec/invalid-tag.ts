import type { Location } from '../shared/location.js'
import type { InvalidIdCandidate, SpecId } from './spec-id.js'

/** Layer 1, tag vocabulary: the text after "nocap:" broke a rule. */
export type VocabularyReason =
  | { readonly kind: 'missing-id' }
  | { readonly kind: 'multiple-ids'; readonly values: readonly [string, string, ...string[]] }
  | { readonly kind: 'id-rule-violation'; readonly invalidCandidate: InvalidIdCandidate }

/** Layer 2, tag form: the comment that holds the tag is of the wrong form. */
export type FormReason = { readonly kind: 'block-comment' }

/** Layer 3, tag position: the tag is not where it can be attached. */
export type PositionReason =
  | { readonly kind: 'no-sentence' | 'not-at-item-end' | 'outside-list-item' }
  | { readonly kind: 'after-code' | 'not-above-test-call' }
  | { readonly kind: 'repeated-id'; readonly id: SpecId; readonly firstTagLine: number }

/** Why a comment that has "nocap:" did not become a spec tag or a test tag. One tag has one reason. */
export type InvalidTagReason = VocabularyReason | FormReason | PositionReason

/** A tag that broke a rule, at the line where the tag starts. No spec item or test item takes an id from it. */
export type InvalidTag = InvalidTagReason & { readonly location: Location }
