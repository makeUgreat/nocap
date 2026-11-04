import type { Coverage as DomainCoverage } from '../../domain/coverage/coverage.js'
import type { CoverageProblem as DomainCoverageProblem } from '../../domain/coverage/coverage-problem.js'
import type { Location as DomainLocation } from '../../domain/shared/location.js'
import type { InvalidIdCandidate as DomainInvalidIdCandidate } from '../../domain/spec/spec-id.js'
import type { SpecInvalidTag } from '../../domain/spec/spec-item.js'
import type { TestInvalidTag } from '../../domain/test/test-item.js'

/** A place in a spec document or a test file. */
export type Location = {
  readonly path: string
  /** Starts at 1. */
  readonly line: number
}

/** A place where the link between spec items and test items is broken. */
export type CoverageProblem =
  | {
      /** A spec item whose id no other spec item has, and that no test item points to. */
      readonly kind: 'uncovered-spec'
      readonly id: string
      readonly location: Location
      /** The sentence of the spec item. Empty when the list item has no text. */
      readonly text: string
    }
  | {
      /** An id that test items point to, but that no spec item has. */
      readonly kind: 'unknown-id'
      readonly id: string
      /** Where the test items that point to the id are, in the order of the test items. */
      readonly testLocations: readonly [Location, ...Location[]]
    }
  | {
      /** An id that two or more spec items have. These spec items are not judged as covered or uncovered. */
      readonly kind: 'duplicate-id'
      readonly id: string
      /** Where the spec items that have the id are, in the order of the spec items. */
      readonly specLocations: readonly [Location, Location, ...Location[]]
    }

/** An id candidate that broke the id rule, with the reason taken from the first character the rule does not allow. */
export type InvalidIdCandidate =
  | { readonly kind: 'invalid-whitespace'; readonly value: string }
  | { readonly kind: 'invalid-char'; readonly value: string; readonly firstInvalidChar: string }

/** A spec tag or a test tag that broke a rule, at the line where the tag starts. No spec item or test item is made from it. */
export type InvalidTag =
  | {
      readonly kind: 'id-rule-violation'
      readonly location: Location
      readonly invalidCandidates: readonly [InvalidIdCandidate, ...InvalidIdCandidate[]]
    }
  | { readonly kind: 'missing-id'; readonly location: Location }
  | {
      /** A spec tag has two or more ids. Only spec tags have this reason. */
      readonly kind: 'multiple-ids'
      readonly location: Location
      readonly ids: readonly [string, string, ...string[]]
    }

/** A file that took no part in the coverage judgment. */
export type FileError =
  | { readonly kind: 'read-error'; readonly path: string; readonly message: string }
  | {
      readonly kind: 'unsupported-extension'
      readonly path: string
      readonly extension: string
      /** The extensions the test file parser supports, in the order the parser lists them. */
      readonly supportedExtensions: readonly [string, ...string[]]
    }
  | { readonly kind: 'syntax-error'; readonly path: string; readonly messages: readonly [string, ...string[]] }

/** A glob pattern that matched no file, with the side it was given for. */
export type UnmatchedPattern = { readonly side: 'spec' | 'test'; readonly pattern: string }

/** Glob patterns that matched no file. When there is one, the check reads no file and judges nothing. */
export type UnmatchedPatterns = {
  readonly kind: 'unmatched-patterns'
  /** Spec patterns first, then test patterns. Each side is in the order given, and each pattern appears once. */
  readonly patterns: readonly [UnmatchedPattern, ...UnmatchedPattern[]]
}

type CoverageCheckResultData = {
  readonly specCount: number
  readonly coveredSpecCount: number
  readonly coverageProblems: readonly CoverageProblem[]
  readonly invalidTags: readonly InvalidTag[]
  readonly fileErrors: readonly FileError[]
}

/** The result of one coverage check. It holds plain data only, so that code outside application does not depend on the domain model. */
export class CoverageCheckResult {
  readonly kind = 'checked'

  private constructor(
    readonly specCount: number,
    readonly coveredSpecCount: number,
    /** Spec side problems in the order their ids first appear in the spec items, then unknown ids in the order they first appear in the test items. */
    readonly coverageProblems: readonly CoverageProblem[],
    /** Invalid tags of the spec documents, then those of the test files. Each group is in code unit order of the paths, then in document order. */
    readonly invalidTags: readonly InvalidTag[],
    /** Errors of the spec documents, then those of the test files. Each group is in code unit order of the paths. */
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
    readonly invalidTags: readonly (SpecInvalidTag | TestInvalidTag)[]
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

function invalidTagOf(invalidTag: SpecInvalidTag | TestInvalidTag): InvalidTag {
  const location = locationOf(invalidTag.location)
  switch (invalidTag.kind) {
    case 'id-rule-violation': {
      const [first, ...rest] = invalidTag.invalidCandidates
      return { kind: 'id-rule-violation', location, invalidCandidates: [invalidIdCandidateOf(first), ...rest.map(invalidIdCandidateOf)] }
    }
    case 'missing-id':
      return { kind: 'missing-id', location }
    case 'multiple-ids': {
      const [first, second, ...rest] = invalidTag.ids
      return { kind: 'multiple-ids', location, ids: [first.value, second.value, ...rest.map((id) => id.value)] }
    }
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
