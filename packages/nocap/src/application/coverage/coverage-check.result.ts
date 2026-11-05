import type { Coverage } from '../../domain/coverage/coverage.js'
import type { InvalidTag } from '../../domain/spec/invalid-tag.js'

/** The use case makes it from the result of a file port or a parser port. */
export type FileError =
  | { readonly kind: 'read-error'; readonly path: string; readonly message: string }
  | {
      readonly kind: 'unsupported-extension'
      readonly path: string
      readonly extension: string
      readonly supportedExtensions: readonly [string, ...string[]]
    }
  | { readonly kind: 'syntax-error'; readonly path: string; readonly messages: readonly [string, ...string[]] }

/** The use case makes it from the result of the file finder. */
export type UnmatchedPattern = { readonly side: 'spec' | 'test'; readonly pattern: string }

/** Holds the judgment of the domain model as it is, with the tags and the files that took no part in it. */
export type CheckedCoverage = {
  readonly kind: 'checked'
  readonly coverage: Coverage
  readonly invalidTags: readonly InvalidTag[]
  readonly fileErrors: readonly FileError[]
}

export type UnmatchedPatterns = {
  readonly kind: 'unmatched-patterns'
  readonly patterns: readonly [UnmatchedPattern, ...UnmatchedPattern[]]
}

/** The result of one coverage check. A driving adapter turns it into its own contract. */
export type CoverageCheckResult = CheckedCoverage | UnmatchedPatterns
