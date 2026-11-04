/** One character that the id rule allows: A-Z, a-z, 0-9, "-" or "_". */
const ID_CHAR = /^[A-Za-z0-9_-]$/u
const WHITESPACE = /^\s$/u

/** The candidate passed the id rule. */
type ValidSpecId = { readonly kind: 'valid'; readonly id: SpecId }

/**
 * An id candidate that broke the id rule, with the reason taken from the first character the rule does not allow.
 *
 * @remarks
 * `invalid-whitespace`: the first such character is a whitespace. Ids written without a comma between them give this reason.
 * `invalid-char`: the first such character is any other character.
 */
export type InvalidIdCandidate =
  | {
      readonly kind: 'invalid-whitespace'
      readonly value: string
    }
  | {
      readonly kind: 'invalid-char'
      readonly value: string
      /** The first character in the candidate that the id rule does not allow. */
      readonly firstInvalidChar: string
    }

export class SpecId {
  private constructor(readonly value: string) {}

  static parse(candidate: string): ValidSpecId | InvalidIdCandidate {
    SpecId.assertNotEmpty(candidate)

    const firstInvalidChar = SpecId.firstInvalidCharOf(candidate)
    if (firstInvalidChar) {
      return SpecId.invalidCandidateOf(candidate, firstInvalidChar)
    }

    return { kind: 'valid', id: new SpecId(candidate) }
  }

  get key(): string {
    return this.value
  }

  equals(other: SpecId): boolean {
    return this.key === other.key
  }

  private static assertNotEmpty(candidate: string): void {
    if (candidate === '') throw new Error('An id candidate must not be empty')
  }

  private static invalidCandidateOf(candidate: string, firstInvalidChar: string): InvalidIdCandidate {
    return WHITESPACE.test(firstInvalidChar)
      ? { kind: 'invalid-whitespace', value: candidate }
      : { kind: 'invalid-char', value: candidate, firstInvalidChar }
  }

  private static firstInvalidCharOf(candidate: string): string | undefined {
    return [...candidate].find((char) => !ID_CHAR.test(char))
  }
}
