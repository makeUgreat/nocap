/**
 * Glob patterns of the spec documents and of the test files, and the directory they are resolved from.
 *
 * @remarks
 * `spec` and `test` each need one or more patterns. An empty array is not a type error, but `checkCoverage` throws a `TypeError` for it.
 * `cwd` is the base directory of the patterns and of the paths in the result. It is `process.cwd()` when left out.
 */
export type CoverageCheckInput = {
  readonly spec: readonly string[]
  readonly test: readonly string[]
  readonly cwd?: string
}

/** A place in a spec document or a test file. `path` is relative to `cwd` and uses `/`. `line` starts at 1. */
export type Location = {
  readonly path: string
  readonly line: number
}

/** A test item that points to the id of a spec item. `location` is the line where the test unit, such as an `it()` call, starts, and `endLine` is the line where it ends. */
export type TestItem = {
  readonly location: Location
  readonly endLine: number
}

/**
 * A spec item with its judgment and the test items linked to it.
 *
 * @remarks
 * `text` is the sentence of the spec item, and is empty when the list item has no text.
 * `status` is the judgment of the spec item:
 * `covered` when one or more test items point to its id,
 * `uncovered-spec` when no test item points to its id,
 * `duplicate-id` when another spec item has the same id. Such a spec item is not judged as covered or uncovered.
 * `testItems` are the test items that point to the id, in code unit order of the paths, then in line order.
 * They are empty unless `status` is `covered`.
 */
export type SpecItem = {
  readonly id: string
  readonly text: string
  readonly location: Location
  readonly status: 'covered' | 'uncovered-spec' | 'duplicate-id'
  readonly testItems: readonly TestItem[]
}

/**
 * A place where the link between spec items and test items is broken.
 *
 * @remarks
 * `uncovered-spec`: a spec item whose id no other spec item has, and that no test item points to.
 * `unknown-id`: an id that test items point to, but that no spec item has. `testLocations` are in the order of the test items.
 * `duplicate-id`: an id that two or more spec items have. `specLocations` are in the order of the spec items.
 */
export type CoverageProblem =
  | { readonly kind: 'uncovered-spec'; readonly id: string; readonly location: Location; readonly text: string }
  | { readonly kind: 'unknown-id'; readonly id: string; readonly testLocations: readonly [Location, ...Location[]] }
  | { readonly kind: 'duplicate-id'; readonly id: string; readonly specLocations: readonly [Location, Location, ...Location[]] }

/** An id candidate that broke the id rule, with the reason taken from the first character the rule does not allow. */
export type InvalidIdCandidate =
  | { readonly kind: 'invalid-whitespace'; readonly value: string }
  | { readonly kind: 'invalid-char'; readonly value: string; readonly firstInvalidChar: string }

/**
 * Layer 1, tag vocabulary: the text after "nocap:" broke a rule.
 *
 * @remarks
 * `missing-id`: "nocap:" has nothing after it.
 * `multiple-ids`: a tag has two or more ids, the non-empty values between its commas. A tag takes one id.
 * `id-rule-violation`: the text after "nocap:" broke the id rule. `invalidCandidate` holds that text and the first character the rule does not allow.
 */
export type VocabularyInvalidTag =
  | { readonly kind: 'missing-id'; readonly location: Location }
  | { readonly kind: 'multiple-ids'; readonly location: Location; readonly values: readonly [string, string, ...string[]] }
  | { readonly kind: 'id-rule-violation'; readonly location: Location; readonly invalidCandidate: InvalidIdCandidate }

/** Layer 2, tag form: a block comment has a line that starts with "nocap:". Test tags are `//` comments only. */
export type FormInvalidTag = { readonly kind: 'block-comment'; readonly location: Location }

/**
 * Layer 3, tag position: the tag is not where it can be attached.
 *
 * @remarks
 * `no-sentence`: a spec tag is the whole first block of a list item, with no spec sentence.
 * `not-at-item-end`: a spec tag is in a list item, but not at the end of its first paragraph.
 * `outside-list-item`: a spec tag is in no list item.
 * `after-code`: a test tag shares a line with code.
 * `not-above-test-call`: a test tag has its own line, but no test unit is below its comment run.
 * `repeated-id`: a test tag is in a comment run after an earlier test tag with the same id. `firstTagLine` is the line of that earlier tag.
 */
export type PositionInvalidTag =
  | {
      readonly kind: 'no-sentence' | 'not-at-item-end' | 'outside-list-item' | 'after-code' | 'not-above-test-call'
      readonly location: Location
    }
  | { readonly kind: 'repeated-id'; readonly location: Location; readonly id: string; readonly firstTagLine: number }

/**
 * A spec tag or a test tag that broke a rule, at the line where the tag starts. No id of a spec item or a test item comes from it.
 * One tag has one reason. The reasons are grouped by the layers of the syntax.
 */
export type InvalidTag = VocabularyInvalidTag | FormInvalidTag | PositionInvalidTag

/**
 * A file that took no part in the coverage judgment.
 *
 * @remarks
 * `supportedExtensions` are the extensions the test file parser supports, in the order the parser lists them.
 */
export type FileError =
  | { readonly kind: 'read-error'; readonly path: string; readonly message: string }
  | {
      readonly kind: 'unsupported-extension'
      readonly path: string
      readonly extension: string
      readonly supportedExtensions: readonly [string, ...string[]]
    }
  | { readonly kind: 'syntax-error'; readonly path: string; readonly messages: readonly [string, ...string[]] }

/** A glob pattern that matched no file, with the side it was given for. */
export type UnmatchedPattern = { readonly side: 'spec' | 'test'; readonly pattern: string }

/**
 * Glob patterns that matched no file. When there is one, the check reads no file and judges nothing.
 *
 * @remarks
 * `patterns` lists spec patterns first, then test patterns. Each side is in the order given, and each pattern appears once.
 */
export type UnmatchedPatterns = {
  readonly kind: 'unmatched-patterns'
  readonly patterns: readonly [UnmatchedPattern, ...UnmatchedPattern[]]
}

/**
 * Every pattern matched a file, and the files were judged.
 *
 * @remarks
 * It does not mean that there is no problem. Check the problem lists or the spec count.
 * `coverageProblems`: spec side problems in the order their ids first appear in the spec items,
 * then unknown ids in the order they first appear in the test items.
 * `invalidTags`: those of the spec documents, then those of the test files. Each group is in code unit order of the paths, then in document order.
 * `fileErrors`: those of the spec documents, then those of the test files. Each group is in code unit order of the paths.
 * `specItems`: every spec item, so its length equals `specCount`. They are in code unit order of the paths, then in line order.
 */
export type CheckedCoverage = {
  readonly kind: 'checked'
  readonly specCount: number
  readonly coveredSpecCount: number
  readonly coverageProblems: readonly CoverageProblem[]
  readonly invalidTags: readonly InvalidTag[]
  readonly fileErrors: readonly FileError[]
  readonly specItems: readonly SpecItem[]
}

/** The result of one coverage check: `checked` when every pattern matched a file, or `unmatched-patterns`. */
export type CoverageCheckResult = CheckedCoverage | UnmatchedPatterns
