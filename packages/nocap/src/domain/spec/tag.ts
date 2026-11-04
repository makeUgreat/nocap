import { isNonEmpty } from '../../lib/array-length.js'
import { IdCandidates, type MissingId, type NotTag } from '../shared/id-candidates.js'
import { type InvalidIdCandidate, SpecId } from './spec-id.js'

/** One or more id candidates of a tag broke the id rule. Each one appears once. */
type IdRuleViolation = {
  readonly kind: 'id-rule-violation'
  readonly invalidCandidates: readonly [InvalidIdCandidate, ...InvalidIdCandidate[]]
}
/** Why a comment body that starts with "nocap:" did not become a tag. */
export type InvalidTagReason = MissingId | IdRuleViolation

/** The body is a tag whose ids all passed the id rule. */
type ValidTag = { readonly kind: 'valid'; readonly tag: Tag }

export class Tag {
  private constructor(readonly ids: readonly [SpecId, ...SpecId[]]) {}

  static parse(body: string): NotTag | InvalidTagReason | ValidTag {
    const result = IdCandidates.parse(body)

    switch (result.kind) {
      case 'not-tag':
      case 'missing-id':
        return result
      case 'candidates':
        return Tag.fromCandidates(result.candidates)
    }
  }

  private static fromCandidates(candidates: IdCandidates): IdRuleViolation | ValidTag {
    const results = candidates.values.map((candidate) => SpecId.parse(candidate))

    const invalidCandidates = withoutDuplicates(results.filter((result) => result.kind !== 'valid'))
    if (isNonEmpty(invalidCandidates)) {
      return { kind: 'id-rule-violation', invalidCandidates }
    }

    const ids = results.flatMap((result) => (result.kind === 'valid' ? [result.id] : []))
    if (!isNonEmpty(ids)) {
      throw new Error('Id candidates with no invalid one must give at least one id')
    }

    return { kind: 'valid', tag: new Tag(ids) }
  }
}

function withoutDuplicates(invalidCandidates: readonly InvalidIdCandidate[]): InvalidIdCandidate[] {
  return invalidCandidates.filter((invalid, index) => invalidCandidates.findIndex((other) => other.value === invalid.value) === index)
}
