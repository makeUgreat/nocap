import type { Coverage as DomainCoverage } from '../../domain/coverage/coverage.js'
import type { CoverageProblem as DomainCoverageProblem } from '../../domain/coverage/coverage-problem.js'
import type { Location as DomainLocation } from '../../domain/shared/location.js'
import type { InvalidIdCandidate as DomainInvalidIdCandidate } from '../../domain/spec/spec-id.js'
import type { InvalidTag as DomainInvalidTag } from '../../domain/spec/invalid-tag.js'

/** A place in a spec document or a test file. `line` starts at 1. */
export type Location = {
  readonly path: string
  readonly line: number
}

/**
 * A place where the link between spec items and test items is broken.
 *
 * @remarks
 * `uncovered-spec`: a spec item whose id no other spec item has, and that no test item points to.
 * `text` is the sentence of the spec item, and is empty when the list item has no text.
 * `unknown-id`: an id that test items point to, but that no spec item has.
 * `testLocations` are in the order of the test items.
 * `duplicate-id`: an id that two or more spec items have. These spec items are not judged as covered or uncovered.
 * `specLocations` are in the order of the spec items.
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

/**
 * Layer 2, tag form: the comment that holds the tag is of the wrong form.
 *
 * @remarks
 * `block-comment`: a block comment has a line that starts with "nocap:". Test tags are `//` comments only.
 */
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

type CoverageCheckResultData = {
  readonly specCount: number
  readonly coveredSpecCount: number
  readonly coverageProblems: readonly CoverageProblem[]
  readonly invalidTags: readonly InvalidTag[]
  readonly fileErrors: readonly FileError[]
}

/**
 * The result of one coverage check.
 *
 * @remarks
 * The fields hold plain data only, so that code outside application does not depend on the domain model.
 * The result also answers two questions about its own data:
 * `hasProblems` is true when there is a coverage problem, an invalid tag or a file error.
 * `isFullyCovered` is true when the covered spec count equals the spec count.
 * `coverageProblems`: spec side problems in the order their ids first appear in the spec items,
 * then unknown ids in the order they first appear in the test items.
 * `invalidTags`: those of the spec documents, then those of the test files.
 * Each group is in code unit order of the paths, then in document order.
 * `fileErrors`: those of the spec documents, then those of the test files. Each group is in code unit order of the paths.
 */
export class CoverageCheckResult {
  readonly kind = 'checked'

  private constructor(
    readonly specCount: number,
    readonly coveredSpecCount: number,
    readonly coverageProblems: readonly CoverageProblem[],
    readonly invalidTags: readonly InvalidTag[],
    readonly fileErrors: readonly FileError[],
  ) {}

  static of(data: CoverageCheckResultData): CoverageCheckResult {
    return new CoverageCheckResult(data.specCount, data.coveredSpecCount, data.coverageProblems, data.invalidTags, data.fileErrors)
  }

  static fromDomain({
    coverage,
    invalidTags,
    fileErrors,
  }: {
    readonly coverage: DomainCoverage
    readonly invalidTags: readonly DomainInvalidTag[]
    readonly fileErrors: readonly FileError[]
  }): CoverageCheckResult {
    return CoverageCheckResult.of({
      specCount: coverage.specCount,
      coveredSpecCount: coverage.coveredSpecCount,
      coverageProblems: coverage.problems.map(coverageProblemOf),
      invalidTags: invalidTags.map(invalidTagOf),
      fileErrors,
    })
  }

  hasProblems(): boolean {
    return this.coverageProblems.length > 0 || this.invalidTags.length > 0 || this.fileErrors.length > 0
  }

  isFullyCovered(): boolean {
    return this.coveredSpecCount === this.specCount
  }
}

function coverageProblemOf(problem: DomainCoverageProblem): CoverageProblem {
  switch (problem.kind) {
    case 'uncovered-spec':
      return {
        kind: 'uncovered-spec',
        id: problem.specItem.id.value,
        location: locationOf(problem.specItem.location),
        text: problem.specItem.text,
      }
    case 'unknown-id': {
      const [first, ...rest] = problem.testItems
      return {
        kind: 'unknown-id',
        id: problem.id.value,
        testLocations: [locationOf(first.location), ...rest.map((testItem) => locationOf(testItem.location))],
      }
    }
    case 'duplicate-id': {
      const [first, second, ...rest] = problem.specItems
      return {
        kind: 'duplicate-id',
        id: problem.id.value,
        specLocations: [locationOf(first.location), locationOf(second.location), ...rest.map((specItem) => locationOf(specItem.location))],
      }
    }
  }
}

function invalidTagOf(invalidTag: DomainInvalidTag): InvalidTag {
  const location = locationOf(invalidTag.location)
  switch (invalidTag.kind) {
    case 'missing-id':
      return { kind: 'missing-id', location }
    case 'multiple-ids':
      return { kind: 'multiple-ids', location, values: invalidTag.values }
    case 'id-rule-violation':
      return { kind: 'id-rule-violation', location, invalidCandidate: invalidIdCandidateOf(invalidTag.invalidCandidate) }
    case 'block-comment':
      return { kind: 'block-comment', location }
    case 'no-sentence':
    case 'not-at-item-end':
    case 'outside-list-item':
    case 'after-code':
    case 'not-above-test-call':
      return { kind: invalidTag.kind, location }
    case 'repeated-id':
      return { kind: 'repeated-id', location, id: invalidTag.id.value, firstTagLine: invalidTag.firstTagLine }
  }
}

function invalidIdCandidateOf(candidate: DomainInvalidIdCandidate): InvalidIdCandidate {
  switch (candidate.kind) {
    case 'invalid-whitespace':
      return { kind: 'invalid-whitespace', value: candidate.value }
    case 'invalid-char':
      return { kind: 'invalid-char', value: candidate.value, firstInvalidChar: candidate.firstInvalidChar }
  }
}

function locationOf(location: DomainLocation): Location {
  return { path: location.path, line: location.line }
}
