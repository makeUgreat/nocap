import { describe, expect, it } from 'vitest'
import {
  CoverageCheckResult,
  type CoverageProblem,
  type FileError,
  type InvalidIdCandidate,
  type InvalidTag,
  type Location,
} from '../application/coverage/coverage-check.result.js'
import { CoverageCheckTextFormatter } from './coverage-check.text.formatter.js'

const formatter = new CoverageCheckTextFormatter()

type ResultData = {
  readonly specCount?: number
  readonly coveredSpecCount?: number
  readonly coverageProblems?: readonly CoverageProblem[]
  readonly invalidTags?: readonly InvalidTag[]
  readonly fileErrors?: readonly FileError[]
}
const resultOf = ({ specCount = 0, coveredSpecCount = 0, coverageProblems = [], invalidTags = [], fileErrors = [] }: ResultData) =>
  CoverageCheckResult.of({ specCount, coveredSpecCount, coverageProblems, invalidTags, fileErrors })
const stdoutLinesOf = (result: CoverageCheckResult) =>
  formatter
    .format(result)
    .stdout.split('\n')
    .filter((line) => line !== '')
const stderrLinesOf = (result: CoverageCheckResult) =>
  formatter
    .format(result)
    .stderr.split('\n')
    .filter((line) => line !== '')

const at = (path: string, line: number): Location => ({ path, line })
const uncovered = (id: string, path: string, line: number, text = ''): CoverageProblem => ({
  kind: 'uncovered-spec',
  id,
  location: at(path, line),
  text,
})
const unknown = (id: string, ...testLocations: [Location, ...Location[]]): CoverageProblem => ({ kind: 'unknown-id', id, testLocations })
const duplicate = (id: string, ...specLocations: [Location, Location, ...Location[]]): CoverageProblem => ({
  kind: 'duplicate-id',
  id,
  specLocations,
})
const invalidId = (path: string, line: number, ...invalidCandidates: [InvalidIdCandidate, ...InvalidIdCandidate[]]): InvalidTag => ({
  kind: 'id-rule-violation',
  location: at(path, line),
  invalidCandidates,
})
const id = (value: string, firstInvalidChar: string): InvalidIdCandidate => ({ kind: 'invalid-char', value, firstInvalidChar })
const idWithWhitespace = (value: string): InvalidIdCandidate => ({ kind: 'invalid-whitespace', value })
const multipleIds = (path: string, line: number, ...ids: [string, string, ...string[]]): InvalidTag => ({
  kind: 'multiple-ids',
  location: at(path, line),
  ids,
})

// nocap: CLI-005
describe('진단 1개를 stdout에 경로:줄: error[종류]: 설명 한 줄로 씀', () => {
  it('ID 규칙 위반이 있으면 경로:줄, 종류, 설명, 안내를 한 줄로 쓴다', () => {
    const result = resultOf({ invalidTags: [invalidId('docs/specs/auth.md', 12, id('AUTH.1', '.'))] })

    expect(stdoutLinesOf(result)).toEqual([
      'docs/specs/auth.md:12: error[invalid-id]: "AUTH.1" has "."; hint: use only A-Z, a-z, 0-9, "-", "_"',
    ])
  })
})

// nocap: CLI-006
describe('줄이 없는 파일 오류는 경로: error[종류]: 설명 형식으로 씀', () => {
  it('지원하지 않는 확장자이면 줄 번호 없이 경로만 쓴다', () => {
    const result = resultOf({
      fileErrors: [{ kind: 'unsupported-extension', path: 'src/old.test.coffee', extension: '.coffee', supportedExtensions: ['.ts'] }],
    })

    expect(stdoutLinesOf(result)).toEqual([
      'src/old.test.coffee: error[unsupported-extension]: ".coffee" is not a supported test file extension; hint: use .ts',
    ])
  })
})

describe('지원하지 않는 확장자 진단의 hint', () => {
  const hintOf = (supportedExtensions: readonly [string, ...string[]]) =>
    stdoutLinesOf(
      resultOf({ fileErrors: [{ kind: 'unsupported-extension', path: 'a.py', extension: '.py', supportedExtensions }] }),
    )[0]?.split('; hint: ')[1]

  it('지원하는 확장자가 2개이면 or로 잇는다', () => {
    expect(hintOf(['.ts', '.js'])).toBe('use .ts or .js')
  })

  it('지원하는 확장자가 3개 이상이면 마지막 앞에만 or를 쓰고 나머지는 쉼표로 잇는다', () => {
    expect(hintOf(['.ts', '.tsx', '.js'])).toBe('use .ts, .tsx or .js')
  })
})

// nocap: CLI-007
describe('커버되지 않은 명세 항목마다 uncovered-spec 진단 1줄', () => {
  it('명세 문장이 있으면 ID와 명세 문장을 쓴다', () => {
    const result = resultOf({ specCount: 1, coverageProblems: [uncovered('A-002', 'docs/auth.md', 3, '30분 후 잠금 해제')] })

    expect(stdoutLinesOf(result)).toEqual(['docs/auth.md:3: error[uncovered-spec]: "A-002" has no test: 30분 후 잠금 해제'])
  })

  it('명세 문장이 빈 문자열이면 ID만 쓴다', () => {
    const result = resultOf({ specCount: 1, coverageProblems: [uncovered('A-002', 'docs/auth.md', 3)] })

    expect(stdoutLinesOf(result)).toEqual(['docs/auth.md:3: error[uncovered-spec]: "A-002" has no test'])
  })
})

// nocap: CLI-008
describe('알 수 없는 ID를 가리키는 테스트 항목마다 unknown-id 진단 1줄', () => {
  it('같은 알 수 없는 ID를 테스트 항목 2개가 가리키면 각 테스트 항목의 위치에 1줄씩 쓴다', () => {
    const result = resultOf({ coverageProblems: [unknown('A-999', at('src/a.test.ts', 10), at('src/b.test.ts', 4))] })

    expect(stdoutLinesOf(result)).toEqual([
      'src/a.test.ts:10: error[unknown-id]: "A-999" is not defined in any spec',
      'src/b.test.ts:4: error[unknown-id]: "A-999" is not defined in any spec',
    ])
  })
})

// nocap: CLI-009
describe('중복 ID를 가진 명세 항목마다 duplicate-id 진단 1줄', () => {
  it('ID가 같은 명세 항목이 2개이면 각 줄에 다른 명세 항목의 위치를 쓴다', () => {
    const result = resultOf({ specCount: 2, coverageProblems: [duplicate('A-001', at('docs/a.md', 5), at('docs/b.md', 4))] })

    expect(stdoutLinesOf(result)).toEqual([
      'docs/a.md:5: error[duplicate-id]: "A-001" is also defined at docs/b.md:4',
      'docs/b.md:4: error[duplicate-id]: "A-001" is also defined at docs/a.md:5',
    ])
  })

  it('ID가 같은 명세 항목이 3개이면 다른 두 위치를 쉼표로 이어 쓴다', () => {
    const result = resultOf({
      specCount: 3,
      coverageProblems: [duplicate('A-001', at('docs/a.md', 1), at('docs/b.md', 2), at('docs/c.md', 3))],
    })

    expect(stdoutLinesOf(result)[0]).toBe('docs/a.md:1: error[duplicate-id]: "A-001" is also defined at docs/b.md:2, docs/c.md:3')
  })
})

// nocap: CLI-010
describe('틀린 태그의 규칙을 어긴 ID마다 invalid-id 진단 1줄', () => {
  it('규칙을 어긴 ID가 2개이면 같은 위치에 2줄을 쓴다', () => {
    const result = resultOf({ invalidTags: [invalidId('src/a.test.ts', 7, id('A.1', '.'), id('B/2', '/'))] })

    expect(stdoutLinesOf(result)).toEqual([
      'src/a.test.ts:7: error[invalid-id]: "A.1" has "."; hint: use only A-Z, a-z, 0-9, "-", "_"',
      'src/a.test.ts:7: error[invalid-id]: "B/2" has "/"; hint: use only A-Z, a-z, 0-9, "-", "_"',
    ])
  })

  it('처음 나온 틀린 문자가 공백이면 쉼표로 ID를 나누라고 안내한다', () => {
    const result = resultOf({ invalidTags: [invalidId('src/a.test.ts', 7, idWithWhitespace('A-001 A-002'))] })

    expect(stdoutLinesOf(result)).toEqual(['src/a.test.ts:7: error[invalid-id]: "A-001 A-002" has a space; hint: separate ids with ","'])
  })
})

// nocap: CLI-011
describe('ID가 누락된 틀린 태그마다 missing-id 진단 1줄', () => {
  it('ID가 누락되면 ID를 쓰라고 안내한다', () => {
    const result = resultOf({ invalidTags: [{ kind: 'missing-id', location: at('src/a.test.ts', 2) }] })

    expect(stdoutLinesOf(result)).toEqual([
      'src/a.test.ts:2: error[missing-id]: missing id in the tag; hint: write an id, e.g. "nocap: AUTH-001"',
    ])
  })
})

// nocap: CLI-013
describe('ID가 2개 이상인 명세 태그마다 multiple-ids 진단 1줄', () => {
  it('명세 태그에 ID가 2개이면 ID 개수와 그 ID들을 쓴다', () => {
    const result = resultOf({ invalidTags: [multipleIds('docs/a.md', 18, 'A-004', 'A-005')] })

    expect(stdoutLinesOf(result)).toEqual([
      'docs/a.md:18: error[multiple-ids]: spec tag has 2 ids "A-004", "A-005"; hint: a spec item takes 1 id',
    ])
  })
})

// nocap: CLI-014
describe('파일 오류마다 read-error, unsupported-extension, syntax-error 진단', () => {
  it('읽지 못한 파일이면 read-error 진단에 오류 내용을 쓴다', () => {
    const result = resultOf({ fileErrors: [{ kind: 'read-error', path: 'docs/a.md', message: 'EACCES: permission denied' }] })

    expect(stdoutLinesOf(result)).toEqual(['docs/a.md: error[read-error]: cannot read file: EACCES: permission denied'])
  })

  it('문법 오류 메시지가 2개이면 syntax-error 진단 2줄을 쓴다', () => {
    const result = resultOf({ fileErrors: [{ kind: 'syntax-error', path: 'a.test.ts', messages: ['Unexpected token', 'Expected ;'] }] })

    expect(stdoutLinesOf(result)).toEqual([
      'a.test.ts: error[syntax-error]: Unexpected token',
      'a.test.ts: error[syntax-error]: Expected ;',
    ])
  })
})

// nocap: CLI-015
describe('진단을 경로의 코드 단위 순서, 같은 경로 안에서는 줄 순서로 씀', () => {
  it('종류가 달라도 경로와 줄 순서로 섞어 쓴다', () => {
    const result = resultOf({
      specCount: 1,
      coverageProblems: [uncovered('A-001', 'docs/a.md', 9), unknown('A-999', at('docs/a.md', 3))],
      invalidTags: [invalidId('B.md', 1, id('X.1', '.'))],
    })

    expect(stdoutLinesOf(result).map((line) => line.split(': ')[0])).toEqual(['B.md:1', 'docs/a.md:3', 'docs/a.md:9'])
  })

  it('줄이 없는 진단은 같은 경로의 다른 진단보다 앞에 쓴다', () => {
    const result = resultOf({
      coverageProblems: [unknown('A-999', at('a.test.ts', 1))],
      fileErrors: [{ kind: 'syntax-error', path: 'a.test.ts', messages: ['x'] }],
    })

    expect(stdoutLinesOf(result).map((line) => line.split(': ')[0])).toEqual(['a.test.ts', 'a.test.ts:1'])
  })
})

// nocap: CLI-016
describe('설명 속 사용자 값은 큰따옴표로 감싸고 JSON 문자열처럼 이스케이프', () => {
  it('ID에 큰따옴표와 역슬래시가 있으면 이스케이프해 쓴다', () => {
    const result = resultOf({ invalidTags: [invalidId('a.test.ts', 1, id('A"\\1', '"'))] })

    expect(stdoutLinesOf(result)[0]).toContain('"A\\"\\\\1" has "\\""')
  })
})

// nocap: CLI-017
describe('설명 속 명세 문장과 오류 메시지의 줄바꿈은 공백 1개로 바꿈', () => {
  it('오류 메시지에 줄바꿈이 있으면 공백으로 바꿔 한 줄로 쓴다', () => {
    const result = resultOf({ fileErrors: [{ kind: 'read-error', path: 'a.md', message: 'first\nsecond' }] })

    expect(stdoutLinesOf(result)).toEqual(['a.md: error[read-error]: cannot read file: first second'])
  })
})

// nocap: CLI-018
describe('요약은 stderr에 씀', () => {
  it('문제가 없으면 stdout은 비우고 stderr에 커버 비율만 쓴다', () => {
    const output = formatter.format(resultOf({ specCount: 1, coveredSpecCount: 1 }))

    expect(output).toEqual({ stdout: '', stderr: '1 of 1 specs covered\n' })
  })

  it('진단이 있어도 stdout에는 진단 줄만 쓴다', () => {
    const output = formatter.format(resultOf({ specCount: 1, coverageProblems: [uncovered('A-001', 'a.md', 1)] }))

    expect(output.stdout).toBe('a.md:1: error[uncovered-spec]: "A-001" has no test\n')
  })
})

// nocap: CLI-019
describe('진단이 있으면 진단 수, 파일 수, 종류별 개수를 한 줄로 씀', () => {
  it('진단 3개가 파일 2개에 있으면 종류 순서대로 0이 아닌 개수만 쓴다', () => {
    const result = resultOf({
      specCount: 1,
      coverageProblems: [uncovered('A-001', 'a.md', 1)],
      invalidTags: [invalidId('b.test.ts', 1, id('X.1', '.'), id('Y.1', '.'))],
    })

    expect(stderrLinesOf(result)[0]).toBe('3 errors in 2 files: 1 uncovered-spec, 2 invalid-id')
  })

  it('진단이 1개이면 단수형으로 쓴다', () => {
    expect(stderrLinesOf(resultOf({ specCount: 1, coverageProblems: [uncovered('A-001', 'a.md', 1)] }))[0]).toBe(
      '1 error in 1 file: 1 uncovered-spec',
    )
  })
})

// nocap: CLI-020
describe('요약의 마지막 줄에 커버된 명세 항목 수와 전체 명세 항목 수를 씀', () => {
  it('명세 항목 3개 중 1개가 커버되면 마지막 줄에 1 of 3을 쓴다', () => {
    const result = resultOf({
      specCount: 3,
      coveredSpecCount: 1,
      coverageProblems: [uncovered('A-001', 'a.md', 1), uncovered('A-003', 'a.md', 3)],
    })

    expect(stderrLinesOf(result).at(-1)).toBe('1 of 3 specs covered')
  })
})

// nocap: CLI-022
describe('색을 쓸 때 앞 진단과 경로가 같은 진단의 경로를 흐린 색으로 씀', () => {
  const colored = new CoverageCheckTextFormatter({ stdout: true, stderr: true })
  const linesOf = () =>
    colored
      .format(
        resultOf({
          specCount: 3,
          coverageProblems: [uncovered('A-001', 'a.md', 1), uncovered('A-002', 'a.md', 2), uncovered('A-003', 'b.md', 1)],
        }),
      )
      .stdout.split('\n')

  it('앞 진단과 경로가 같으면 경로를 흐린 색으로 쓴다', () => {
    expect(linesOf()[1]?.startsWith('\u001b[2ma.md\u001b[0m')).toBe(true)
  })

  it('앞 진단과 경로가 다르면 경로를 흐린 색으로 쓰지 않는다', () => {
    const lines = linesOf()

    expect([lines[0]?.startsWith('\u001b[36ma.md'), lines[2]?.startsWith('\u001b[36mb.md')]).toEqual([true, true])
  })
})

describe('색을 쓰지 않을 때', () => {
  it('출력에 ANSI 코드가 없다', () => {
    const output = formatter.format(resultOf({ specCount: 1, coverageProblems: [uncovered('A-001', 'a.md', 1)] }))

    expect(`${output.stdout}${output.stderr}`).not.toContain('\u001b[')
  })
})
