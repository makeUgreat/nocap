import type * as Usecase from '../../application/coverage/coverage-check.result.js'
import type { CoverageCheckInput as UsecaseInput } from '../../application/coverage/coverage-check.usecase.js'
import type { SpecJudgment as DomainSpecJudgment } from '../../domain/coverage/coverage.js'
import type { CoverageProblem as DomainCoverageProblem } from '../../domain/coverage/coverage-problem.js'
import type { Location as DomainLocation } from '../../domain/shared/location.js'
import type { InvalidTag as DomainInvalidTag } from '../../domain/spec/invalid-tag.js'
import type { InvalidIdCandidate as DomainInvalidIdCandidate } from '../../domain/spec/spec-id.js'
import { isNonEmpty, mapNonEmpty, mapTwoOrMore } from '../../lib/array-length.js'
import type { Equals } from '../../lib/type-equality.js'
import type * as Public from './coverage-check.public.js'

// These inner types are passed to the result as they are, because each has the same type as its public type.
// When an inner type changes, its check stops compiling. Then map that type field by field, or change the public type.
true satisfies Equals<Usecase.FileError, Public.FileError>
true satisfies Equals<Usecase.UnmatchedPattern, Public.UnmatchedPattern>
true satisfies Equals<DomainInvalidIdCandidate, Public.InvalidIdCandidate>

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
          fileErrors,
          specItems: coverage.specJudgments.map(toSpecItem),
        }
      }
      case 'unmatched-patterns':
        return { kind: 'unmatched-patterns', patterns: result.patterns }
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
    testItems:
      judgment.kind === 'covered'
        ? judgment.testItems.map((testItem) => ({ location: toLocation(testItem.location), endLine: testItem.endLine }))
        : [],
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
      return { kind: 'id-rule-violation', location, invalidCandidate: invalidTag.invalidCandidate }
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

function toLocation(location: DomainLocation): Public.Location {
  return { path: location.path, line: location.line }
}
