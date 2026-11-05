const ID_CHAR = /^[A-Za-z0-9_-]$/u
const WHITESPACE = /^\s$/u

type ValidSpecId = { readonly kind: 'valid'; readonly id: SpecId }

export type InvalidIdCandidate =
  | { readonly kind: 'invalid-whitespace'; readonly value: string }
  | { readonly kind: 'invalid-char'; readonly value: string; readonly firstInvalidChar: string }

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
    // oxlint-disable-next-line typescript/no-misused-spread -- an id is checked one code point at a time
    return [...candidate].find((char) => !ID_CHAR.test(char))
  }
}
