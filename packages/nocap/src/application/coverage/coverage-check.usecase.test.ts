import { describe, expect, it } from 'vitest'
import type { CoverageCheckResult } from './coverage-check.result.js'
import { CoverageCheckUsecase } from './coverage-check.usecase.js'
import type { FileFinder } from '../file/file.finder.js'
import type { FileReader } from '../file/file.reader.js'
import type { SpecDocumentParser } from '../spec/spec-document.parser.js'
import type { TestFileParser } from '../test/test-file.parser.js'

const UNREADABLE = '<unreadable>'
const SYNTAX_ERROR = '<syntax error>'

const fakeFinder = (pathsByPattern: Record<string, string[]>): FileFinder => ({
  find: async (patterns) => patterns.flatMap((pattern) => pathsByPattern[pattern] ?? []),
})

const fakeReader = (contentByPath: Record<string, string>): FileReader => ({
  read: async (path) => {
    const content = contentByPath[path] ?? ''
    return content === UNREADABLE ? { kind: 'read-error', message: `cannot read ${path}` } : { kind: 'read', content }
  },
})

const fakeSpecParser: SpecDocumentParser = {
  parse: (content) => content.split('\n').map((body, index) => ({ line: index + 1, text: '', comment: { line: index + 1, body } })),
}

const fakeTestParser: TestFileParser = {
  parse: (path, content) => {
    if (!path.endsWith('.ts')) return { kind: 'unsupported-extension', extension: path.slice(path.lastIndexOf('.')) }
    if (content === SYNTAX_ERROR) return { kind: 'syntax-error', messages: ['unexpected token'] }
    const sites = content.split('\n').map((body, index) => ({
      line: 2 * index + 2,
      comment: { line: 2 * index + 1, body },
    }))
    return { kind: 'parsed', sites }
  },
}

const run = (pathsByPattern: Record<string, string[]>, contentByPath: Record<string, string>) =>
  new CoverageCheckUsecase(fakeFinder(pathsByPattern), fakeReader(contentByPath), fakeSpecParser, fakeTestParser).run({
    specPatterns: ['specs'],
    testPatterns: ['tests'],
  })

const uncoveredSpecPathsOf = (result: CoverageCheckResult) =>
  result.coverageProblems.flatMap((problem) => (problem.kind === 'uncovered-spec' ? [problem.location.path] : []))

// nocap: CC-001
describe('명세 패턴의 파일은 명세 문서로, 테스트 패턴의 파일은 테스트 파일로 읽음', () => {
  it('명세 패턴의 파일에 있는 명세 항목이 테스트 패턴의 파일에 있는 테스트 항목과 연결된다', async () => {
    const result = await run({ specs: ['a.md'], tests: ['a.test.ts'] }, { 'a.md': 'nocap: A-001', 'a.test.ts': 'nocap: A-001' })

    expect([result.specCount, result.coveredSpecCount]).toEqual([1, 1])
  })
})

// nocap: CC-003
describe('같은 쪽 패턴 여러 개에 맞는 파일은 한 번만 읽음', () => {
  it('테스트 파일이 테스트 패턴 2개에 맞아도 그 파일의 테스트 항목은 1번만 판정에 들어간다', async () => {
    const result = await run({ specs: [], tests: ['a.test.ts', 'a.test.ts'] }, { 'a.test.ts': 'nocap: A-999' })

    expect(result.coverageProblems.map((problem) => (problem.kind === 'unknown-id' ? problem.testLocations.length : problem.kind))).toEqual(
      [1],
    )
  })
})

// nocap: CC-004
describe('명세 패턴과 테스트 패턴에 모두 맞는 파일은 양쪽에서 읽음', () => {
  it('두 패턴에 모두 맞는 Markdown 파일은 명세 문서로 읽힌다', async () => {
    const result = await run({ specs: ['a.md'], tests: ['a.md'] }, { 'a.md': 'nocap: A-001' })

    expect(uncoveredSpecPathsOf(result)).toEqual(['a.md'])
  })

  it('두 패턴에 모두 맞는 Markdown 파일은 테스트 파일로도 읽혀 지원하지 않는 확장자로 보고된다', async () => {
    const result = await run({ specs: ['a.md'], tests: ['a.md'] }, { 'a.md': 'nocap: A-001' })

    expect(result.fileErrors).toEqual([{ kind: 'unsupported-extension', path: 'a.md', extension: '.md' }])
  })
})

// nocap: CC-006
describe('읽지 못한 파일을 경로와 함께 보고', () => {
  it('읽지 못한 파일이 있으면 그 경로와 오류 메시지를 보고한다', async () => {
    const result = await run({ specs: ['a.md'], tests: [] }, { 'a.md': UNREADABLE })

    expect(result.fileErrors).toEqual([{ kind: 'read-error', path: 'a.md', message: 'cannot read a.md' }])
  })
})

// nocap: CC-007
describe('지원하지 않는 확장자와 문법 오류를 테스트 파일의 경로와 함께 보고', () => {
  it('지원하지 않는 확장자의 테스트 파일이 있으면 그 경로와 확장자를 보고한다', async () => {
    const result = await run({ specs: [], tests: ['a.py'] }, { 'a.py': '' })

    expect(result.fileErrors).toEqual([{ kind: 'unsupported-extension', path: 'a.py', extension: '.py' }])
  })

  it('문법 오류가 있는 테스트 파일이 있으면 그 경로와 오류 메시지를 보고한다', async () => {
    const result = await run({ specs: [], tests: ['a.test.ts'] }, { 'a.test.ts': SYNTAX_ERROR })

    expect(result.fileErrors).toEqual([{ kind: 'syntax-error', path: 'a.test.ts', messages: ['unexpected token'] }])
  })
})

// nocap: CC-008
describe('파일 오류가 있어도 나머지 파일로 판정', () => {
  it('테스트 파일 하나에 문법 오류가 있어도 다른 테스트 파일의 테스트 항목은 연결된다', async () => {
    const result = await run(
      { specs: ['a.md'], tests: ['a.test.ts', 'b.test.ts'] },
      { 'a.md': 'nocap: A-001', 'a.test.ts': SYNTAX_ERROR, 'b.test.ts': 'nocap: A-001' },
    )

    expect(result.coveredSpecCount).toBe(1)
  })
})

// nocap: CC-009
describe('경로의 코드 단위 순서대로 파일을 판정 결과에 반영', () => {
  it('찾은 순서와 관계없이 대문자로 시작하는 경로의 명세 항목이 먼저 온다', async () => {
    const result = await run({ specs: ['a.md', 'B.md'], tests: [] }, { 'a.md': 'nocap: A-001', 'B.md': 'nocap: B-001' })

    expect(uncoveredSpecPathsOf(result)).toEqual(['B.md', 'a.md'])
  })
})

describe('틀린 태그', () => {
  it('명세 문서의 틀린 태그를 결과에 담는다', async () => {
    const result = await run({ specs: ['a.md'], tests: [] }, { 'a.md': 'nocap: A.1' })

    expect(result.invalidTags).toEqual([
      {
        kind: 'id-rule-violation',
        location: { path: 'a.md', line: 1 },
        invalidCandidates: [{ kind: 'invalid-char', value: 'A.1', firstInvalidChar: '.' }],
      },
    ])
  })
})

describe('빈 입력', () => {
  it('찾은 파일이 없으면 모든 목록이 비어 있다', async () => {
    const result = await run({}, {})

    expect([result.specCount, result.coverageProblems, result.invalidTags, result.fileErrors]).toEqual([0, [], [], []])
  })
})
