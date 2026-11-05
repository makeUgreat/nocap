import type * as Usecase from '../../application/coverage/coverage-check.result.js'
import type { CoverageCheckInput as UsecaseInput } from '../../application/coverage/coverage-check.usecase.js'
import type { SpecJudgment as DomainSpecJudgment } from '../../domain/coverage/coverage.js'
import type { CoverageProblem as DomainCoverageProblem } from '../../domain/coverage/coverage-problem.js'
import type { Location as DomainLocation } from '../../domain/shared/location.js'
import type { InvalidTag as DomainInvalidTag } from '../../domain/spec/invalid-tag.js'
import type { InvalidIdCandidate as DomainInvalidIdCandidate } from '../../domain/spec/spec-id.js'
import { isNonEmpty, mapNonEmpty, mapTwoOrMore } from '../../lib/array-length.js'
import type * as Public from './coverage-check.public.js'

type CoverageCheck = { run(input: UsecaseInput): Promise<Usecase.CoverageCheckResult> }

export class CoverageCheckApi {
  constructor(private readonly coverageCheckIn: (cwd: string) => CoverageCheck) {}

  async run(input: Public.CoverageCheckInput): Promise<Public.CoverageCheckResult> {
    const { spec, test, cwd } = validInputOf(input)
    const result = await this.coverageCheckIn(cwd).run({ specPatterns: spec, testPatterns: test })
    switch (result.kind) {
      case 'checked': {
        const { coverage, invalidTags, fileErrors } = result
        return {
          kind: 'checked',
          specCount: coverage.specCount,
          coveredSpecCount: coverage.coveredSpecCount,
          coverageProblems: coverage.problems.map(toCoverageProblem),
          invalidTags: invalidTags.map(toInvalidTag),
          fileErrors: fileErrors.map(toFileError),
          specItems: coverage.specJudgments.map(toSpecItem),
        }
      }
      case 'unmatched-patterns':
        return { kind: 'unmatched-patterns', patterns: mapNonEmpty(result.patterns, toUnmatchedPattern) }
    }
  }
}

type ValidInput = {
  readonly spec: readonly [string, ...string[]]
  readonly test: readonly [string, ...string[]]
  readonly cwd: string
}

// The input type allows an empty pattern list, and JavaScript callers and type assertions can pass any value.
// An empty pattern list would match no file and report no problem, so it must not pass silently.
function validInputOf(input: Public.CoverageCheckInput): ValidInput {
  if (typeof input !== 'object' || input === null) throw new TypeError('input must be an object')
  return {
    spec: patternsOf('spec', input.spec),
    test: patternsOf('test', input.test),
    cwd: cwdOf(input.cwd),
  }
}

function patternsOf(name: 'spec' | 'test', value: unknown): readonly [string, ...string[]] {
  if (Array.isArray(value) && value.every(isString) && isNonEmpty(value)) return value
  throw new TypeError(`${name} must be an array of one or more strings`)
}

function cwdOf(value: unknown): string {
  if (value === undefined) return process.cwd()
  if (isString(value)) return value
  throw new TypeError('cwd must be a string')
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function toCoverageProblem(problem: DomainCoverageProblem): Public.CoverageProblem {
  switch (problem.kind) {
    case 'uncovered-spec':
      return {
        kind: 'uncovered-spec',
        id: problem.specItem.id.value,
        location: toLocation(problem.specItem.location),
        text: problem.specItem.text,
      }
    case 'unknown-id':
      return {
        kind: 'unknown-id',
        id: problem.id.value,
        testLocations: mapNonEmpty(problem.testItems, (testItem) => toLocation(testItem.location)),
      }
    case 'duplicate-id':
      return {
        kind: 'duplicate-id',
        id: problem.id.value,
        specLocations: mapTwoOrMore(problem.specItems, (specItem) => toLocation(specItem.location)),
      }
  }
}

function toSpecItem(judgment: DomainSpecJudgment): Public.SpecItem {
  const { specItem } = judgment
  return {
    id: specItem.id.value,
    text: specItem.text,
    location: toLocation(specItem.location),
    status: judgment.kind,
    testItems: judgment.kind === 'covered' ? judgment.testItems.map((testItem) => ({ location: toLocation(testItem.location) })) : [],
  }
}

function toInvalidTag(invalidTag: DomainInvalidTag): Public.InvalidTag {
  const location = toLocation(invalidTag.location)
  switch (invalidTag.kind) {
    case 'missing-id':
      return { kind: 'missing-id', location }
    case 'multiple-ids':
      return { kind: 'multiple-ids', location, values: invalidTag.values }
    case 'id-rule-violation':
      return { kind: 'id-rule-violation', location, invalidCandidate: toInvalidIdCandidate(invalidTag.invalidCandidate) }
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

function toInvalidIdCandidate(candidate: DomainInvalidIdCandidate): Public.InvalidIdCandidate {
  switch (candidate.kind) {
    case 'invalid-whitespace':
      return { kind: 'invalid-whitespace', value: candidate.value }
    case 'invalid-char':
      return { kind: 'invalid-char', value: candidate.value, firstInvalidChar: candidate.firstInvalidChar }
  }
}

function toFileError(fileError: Usecase.FileError): Public.FileError {
  switch (fileError.kind) {
    case 'read-error':
      return { kind: 'read-error', path: fileError.path, message: fileError.message }
    case 'unsupported-extension':
      return {
        kind: 'unsupported-extension',
        path: fileError.path,
        extension: fileError.extension,
        supportedExtensions: fileError.supportedExtensions,
      }
    case 'syntax-error':
      return { kind: 'syntax-error', path: fileError.path, messages: fileError.messages }
  }
}

function toUnmatchedPattern({ side, pattern }: Usecase.UnmatchedPattern): Public.UnmatchedPattern {
  return { side, pattern }
}

function toLocation(location: DomainLocation): Public.Location {
  return { path: location.path, line: location.line }
}
