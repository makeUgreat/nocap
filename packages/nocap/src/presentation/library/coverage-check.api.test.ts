import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  CoverageCheckResult as UsecaseResult,
  FileError as UsecaseFileError,
} from '../../application/coverage/coverage-check.result.js'
import type { CoverageCheckInput as UsecaseInput } from '../../application/coverage/coverage-check.usecase.js'
import { Coverage } from '../../domain/coverage/coverage.js'
import type { InvalidTag as DomainInvalidTag } from '../../domain/spec/invalid-tag.js'
import { SpecDocument } from '../../domain/spec/spec-document.js'
import { SpecItem } from '../../domain/spec/spec-item.js'
import { TestFile } from '../../domain/test/test-file.js'
import type { TestItem } from '../../domain/test/test-item.js'
import { CoverageCheckApi } from './coverage-check.api.js'
import type { CheckedCoverage, CoverageCheckInput } from './coverage-check.public.js'

const checkedOf = ({
  specItems = [],
  testItems = [],
  invalidTags = [],
  fileErrors = [],
}: {
  readonly specItems?: readonly SpecItem[]
  readonly testItems?: readonly TestItem[]
  readonly invalidTags?: readonly DomainInvalidTag[]
  readonly fileErrors?: readonly UsecaseFileError[]
}): UsecaseResult => ({ kind: 'checked', coverage: Coverage.of({ specItems, testItems }), invalidTags, fileErrors })

const emptyResult = checkedOf({})

// Records the cwd and the use case input of each call.
const recordingApi = () => {
  const calls: { cwd: string; input: UsecaseInput }[] = []
  const api = new CoverageCheckApi((cwd) => ({
    run: async (input) => {
      calls.push({ cwd, input })
      return emptyResult
    },
  }))
  return { api, calls }
}
const valid: CoverageCheckInput = { spec: ['docs/*.md'], test: ['src/*.test.ts'], cwd: '/repo' }
afterEach(() => {
  vi.restoreAllMocks()
})

// Lets a test pass a value that the input type forbids, as a JavaScript caller can.
const unchecked = (input: unknown) => input as CoverageCheckInput

// nocap: LIB-003
describe('cwd를 기준 디렉토리로 쓰고 없으면 process.cwd()를 씀', () => {
  it('cwd가 있으면 그 디렉토리로 유스케이스를 만든다', async () => {
    const { api, calls } = recordingApi()

    await api.run(valid)

    expect(calls.map(({ cwd }) => cwd)).toEqual(['/repo'])
  })

  it('cwd가 없으면 process.cwd()로 유스케이스를 만든다', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/from-process')
    const { api, calls } = recordingApi()

    await api.run({ spec: ['docs/*.md'], test: ['src/*.test.ts'] })

    expect(calls.map(({ cwd }) => cwd)).toEqual(['/from-process'])
  })
})

// nocap: LIB-004
describe('spec이나 test가 문자열 1개 이상의 배열이 아니면 TypeError', () => {
  it('spec이 빈 배열이면 TypeError를 던지고 유스케이스를 실행하지 않는다', async () => {
    const { api, calls } = recordingApi()
    // A string[] variable passes the type check, as patterns read from a config file do.
    const noPatterns: string[] = []

    await expect(api.run({ ...valid, spec: noPatterns })).rejects.toThrow(new TypeError('spec must be an array of one or more strings'))
    expect(calls).toEqual([])
  })

  it('test가 배열이 아닌 문자열이면 TypeError를 던진다', async () => {
    await expect(recordingApi().api.run(unchecked({ ...valid, test: 'src/*.test.ts' }))).rejects.toThrow(
      new TypeError('test must be an array of one or more strings'),
    )
  })

  it('spec에 문자열이 아닌 값이 있으면 TypeError를 던진다', async () => {
    await expect(recordingApi().api.run(unchecked({ ...valid, spec: ['docs/*.md', 1] }))).rejects.toThrow(TypeError)
  })

  it('spec과 test가 문자열 1개씩이면 그 패턴으로 유스케이스를 실행한다', async () => {
    const { api, calls } = recordingApi()

    await api.run(valid)

    expect(calls.map(({ input }) => input)).toEqual([{ specPatterns: ['docs/*.md'], testPatterns: ['src/*.test.ts'] }])
  })
})

// nocap: LIB-005
describe('cwd가 있고 문자열이 아니면 TypeError', () => {
  it('cwd가 숫자이면 TypeError를 던진다', async () => {
    await expect(recordingApi().api.run(unchecked({ ...valid, cwd: 1 }))).rejects.toThrow(new TypeError('cwd must be a string'))
  })
})

// nocap: LIB-018
describe('예상하지 못한 오류는 호출자에게 그대로 던짐', () => {
  it('유스케이스가 오류를 던지면 같은 오류 객체를 던진다', async () => {
    const error = new Error('boom')
    const api = new CoverageCheckApi(() => ({
      run: async () => {
        throw error
      },
    }))

    await expect(api.run(valid)).rejects.toBe(error)
  })
})

describe('입력이 객체가 아님', () => {
  it('입력이 null이면 TypeError를 던진다', async () => {
    await expect(recordingApi().api.run(unchecked(null))).rejects.toThrow(new TypeError('input must be an object'))
  })
})

const spec = (id: string, path: string, line: number, text = ''): SpecItem => {
  const result = SpecItem.parse(path, { line, body: `nocap: ${id}`, placement: { kind: 'first-paragraph-end', itemLine: line, text } })
  if (result.kind !== 'valid') throw new Error(`not a spec item in fixture: ${id}`)
  return result.item
}
const lineComment = (line: number, body: string) => ({ line, endLine: line, body, style: 'line' as const, hasCodeOnLine: false })
// The tag is on the line above the test unit, so the test item is at `line`.
const test = (id: string, path: string, line: number, endLine = line): TestItem => {
  const [item] = TestFile.of(path, [lineComment(line - 1, `nocap: ${id}`)], [{ line, endLine }]).testItems
  if (item === undefined) throw new Error(`not a test item in fixture: ${id}`)
  return item
}
const specComment = (line: number, body: string) => ({
  line,
  body,
  placement: { kind: 'first-paragraph-end' as const, itemLine: line, text: '' },
})

// Runs the api with a use case that returns `result`, and returns the public result.
const publicResultOf = async (result: UsecaseResult) => new CoverageCheckApi(() => ({ run: async () => result })).run(valid)
const checkedPublicOf = async (result: UsecaseResult): Promise<CheckedCoverage> => {
  const publicResult = await publicResultOf(result)
  if (publicResult.kind !== 'checked') throw new Error(`Expected a checked result, got ${publicResult.kind}`)
  return publicResult
}

describe('유스케이스 결과를 공개 타입으로 바꿈', () => {
  it('커버되지 않은 명세 항목이면 ID 문자열, 위치, 명세 문장을 담는다', async () => {
    const result = await checkedPublicOf(checkedOf({ specItems: [spec('A-001', 'a.md', 3, '잠금')] }))

    expect(result.coverageProblems).toEqual([{ kind: 'uncovered-spec', id: 'A-001', location: { path: 'a.md', line: 3 }, text: '잠금' }])
  })

  it('알 수 없는 ID이면 그 ID를 가리키는 테스트 항목의 위치를 순서대로 담는다', async () => {
    const result = await checkedPublicOf(checkedOf({ testItems: [test('A-999', 'a.test.ts', 1), test('A-999', 'b.test.ts', 2)] }))

    expect(result.coverageProblems).toEqual([
      {
        kind: 'unknown-id',
        id: 'A-999',
        testLocations: [
          { path: 'a.test.ts', line: 1 },
          { path: 'b.test.ts', line: 2 },
        ],
      },
    ])
  })

  it('중복 ID이면 그 ID를 가진 명세 항목의 위치를 순서대로 담는다', async () => {
    const result = await checkedPublicOf(checkedOf({ specItems: [spec('A-001', 'a.md', 1), spec('A-001', 'b.md', 2)] }))

    expect(result.coverageProblems).toEqual([
      {
        kind: 'duplicate-id',
        id: 'A-001',
        specLocations: [
          { path: 'a.md', line: 1 },
          { path: 'b.md', line: 2 },
        ],
      },
    ])
  })

  it('명세 항목 수와 커버된 명세 항목 수를 담는다', async () => {
    const result = await checkedPublicOf(
      checkedOf({ specItems: [spec('A-001', 'a.md', 1), spec('A-002', 'a.md', 2)], testItems: [test('A-001', 'a.test.ts', 1)] }),
    )

    expect([result.specCount, result.coveredSpecCount]).toEqual([2, 1])
  })

  it('ID 규칙 위반이면 위치와 규칙을 어긴 ID 후보를 담는다', async () => {
    const { invalidTags } = TestFile.of('a.test.ts', [lineComment(1, 'nocap: B C')], [{ line: 2, endLine: 2 }])

    const result = await checkedPublicOf(checkedOf({ invalidTags }))

    expect(result.invalidTags).toEqual([
      {
        kind: 'id-rule-violation',
        location: { path: 'a.test.ts', line: 1 },
        invalidCandidate: { kind: 'invalid-whitespace', value: 'B C' },
      },
    ])
  })

  it('ID 개수 초과이면 쉼표로 나눈 값들을 담는다', async () => {
    const { invalidTags } = SpecDocument.of('a.md', [specComment(4, 'nocap: A-001, A-002')])

    const result = await checkedPublicOf(checkedOf({ invalidTags }))

    expect(result.invalidTags).toEqual([{ kind: 'multiple-ids', location: { path: 'a.md', line: 4 }, values: ['A-001', 'A-002'] }])
  })

  it('ID 누락이면 위치만 담는다', async () => {
    const { invalidTags } = TestFile.of('a.test.ts', [lineComment(1, 'nocap:')], [{ line: 2, endLine: 2 }])

    const result = await checkedPublicOf(checkedOf({ invalidTags }))

    expect(result.invalidTags).toEqual([{ kind: 'missing-id', location: { path: 'a.test.ts', line: 1 } }])
  })

  it('같은 ID 반복이면 ID 문자열과 첫 태그의 줄을 담는다', async () => {
    const { invalidTags } = TestFile.of(
      'a.test.ts',
      [lineComment(1, 'nocap: A-001'), lineComment(2, 'nocap: A-001')],
      [{ line: 3, endLine: 3 }],
    )

    const result = await checkedPublicOf(checkedOf({ invalidTags }))

    expect(result.invalidTags).toEqual([{ kind: 'repeated-id', location: { path: 'a.test.ts', line: 2 }, id: 'A-001', firstTagLine: 1 }])
  })

  it('위치 위반이면 위치와 위치 이유만 담는다', async () => {
    const { invalidTags } = SpecDocument.of('a.md', [{ line: 5, body: 'nocap: A-001', placement: { kind: 'first-block' } }])

    const result = await checkedPublicOf(checkedOf({ invalidTags }))

    expect(result.invalidTags).toEqual([{ kind: 'no-sentence', location: { path: 'a.md', line: 5 } }])
  })

  it('커버된 명세 항목이면 상태 covered와 연결된 테스트 항목의 위치와 끝 줄을 담는다', async () => {
    const result = await checkedPublicOf(
      checkedOf({
        specItems: [spec('A-001', 'a.md', 3, '잠금')],
        testItems: [test('A-001', 'a.test.ts', 2), test('A-001', 'a.test.ts', 5, 7)],
      }),
    )

    expect(result.specItems).toEqual([
      {
        id: 'A-001',
        text: '잠금',
        location: { path: 'a.md', line: 3 },
        status: 'covered',
        testItems: [
          { location: { path: 'a.test.ts', line: 2 }, endLine: 2 },
          { location: { path: 'a.test.ts', line: 5 }, endLine: 7 },
        ],
      },
    ])
  })

  it('커버되지 않은 명세 항목이면 상태 uncovered-spec과 빈 테스트 항목 목록을 담는다', async () => {
    const result = await checkedPublicOf(checkedOf({ specItems: [spec('A-001', 'a.md', 1)] }))

    expect(result.specItems.map(({ status, testItems }) => [status, testItems])).toEqual([['uncovered-spec', []]])
  })

  it('중복 ID 명세 항목이면 가리키는 테스트 항목이 있어도 상태 duplicate-id와 빈 테스트 항목 목록을 담는다', async () => {
    const result = await checkedPublicOf(
      checkedOf({ specItems: [spec('A-001', 'a.md', 1), spec('A-001', 'b.md', 1)], testItems: [test('A-001', 'a.test.ts', 2)] }),
    )

    expect(result.specItems.map(({ status, testItems }) => [status, testItems])).toEqual([
      ['duplicate-id', []],
      ['duplicate-id', []],
    ])
  })

  it('파일 오류를 종류마다 그대로 담는다', async () => {
    const fileErrors: UsecaseFileError[] = [
      { kind: 'read-error', path: 'a.md', message: 'EACCES' },
      { kind: 'unsupported-extension', path: 'a.py', extension: '.py', supportedExtensions: ['.ts'] },
      { kind: 'syntax-error', path: 'a.test.ts', messages: ['unexpected token'] },
    ]

    const result = await checkedPublicOf(checkedOf({ fileErrors }))

    expect(result.fileErrors).toEqual(fileErrors)
  })

  it('파일을 찾지 못한 패턴을 순서대로 담는다', async () => {
    const result = await publicResultOf({
      kind: 'unmatched-patterns',
      patterns: [
        { side: 'spec', pattern: 'dcos/*.md' },
        { side: 'test', pattern: 'tset/*.ts' },
      ],
    })

    expect(result).toEqual({
      kind: 'unmatched-patterns',
      patterns: [
        { side: 'spec', pattern: 'dcos/*.md' },
        { side: 'test', pattern: 'tset/*.ts' },
      ],
    })
  })
})
