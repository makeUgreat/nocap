import { isNonEmpty } from '../../lib/array-length.js'

const PREFIX = 'nocap:'

/** The comment body does not start with "nocap:". */
export type NotTag = { readonly kind: 'not-tag' }
/** "nocap:" has no id after it, or two commas have nothing between them. */
export type MissingId = { readonly kind: 'missing-id' }

/** The body is a tag and splits into one or more id candidates. */
type CandidatesFound = { readonly kind: 'candidates'; readonly candidates: IdCandidates }

export class IdCandidates {
  private constructor(readonly values: readonly [string, ...string[]]) {}

  static parse(body: string): NotTag | MissingId | CandidatesFound {
    const textAfterPrefix = IdCandidates.textAfterPrefixOf(body)
    if (textAfterPrefix === undefined) {
      return { kind: 'not-tag' }
    }

    const parts = IdCandidates.partsOf(textAfterPrefix)
    if (parts.includes('')) {
      return { kind: 'missing-id' }
    }

    return { kind: 'candidates', candidates: new IdCandidates(parts) }
  }

  private static textAfterPrefixOf(body: string): string | undefined {
    const trimmed = body.trim()
    return trimmed.startsWith(PREFIX) ? trimmed.slice(PREFIX.length) : undefined
  }

  private static partsOf(textAfterPrefix: string): [string, ...string[]] {
    const parts = textAfterPrefix.split(',').map((part) => part.trim())
    const kept = IdCandidates.withoutTrailingComma(parts)
    if (!isNonEmpty(kept)) throw new Error('Splitting a tag body must give at least one part')
    return kept
  }

  private static withoutTrailingComma(parts: string[]): string[] {
    const endsWithComma = parts.length > 1 && parts.at(-1) === ''
    return endsWithComma ? parts.slice(0, -1) : parts
  }
}
