import type { VocabularyReason } from './invalid-tag.js'
import { SpecId } from './spec-id.js'
import { hasTwoOrMore } from '../../lib/array-length.js'

const PREFIX = 'nocap:'

export type NotTag = { readonly kind: 'not-tag' }
type ValidTag = { readonly kind: 'valid'; readonly tag: Tag }

export class Tag {
  private constructor(readonly id: SpecId) {}

  static parse(body: string): NotTag | VocabularyReason | ValidTag {
    const trimmed = body.trim()
    if (!trimmed.startsWith(PREFIX)) {
      return { kind: 'not-tag' }
    }

    const candidate = trimmed.slice(PREFIX.length).trim()
    if (candidate === '') {
      return { kind: 'missing-id' }
    }

    const values = candidate
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value !== '')
    if (hasTwoOrMore(values)) {
      return { kind: 'multiple-ids', values }
    }

    const result = SpecId.parse(candidate)
    if (result.kind !== 'valid') {
      return { kind: 'id-rule-violation', invalidCandidate: result }
    }
    return { kind: 'valid', tag: new Tag(result.id) }
  }
}
