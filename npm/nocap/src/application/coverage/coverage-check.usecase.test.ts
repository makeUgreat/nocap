import { describe, expect, it } from 'vitest'
import type { CheckedCoverage } from './coverage-check.result.js'
import { CoverageCheckUsecase, type CoverageCheckInput } from './coverage-check.usecase.js'
import type { FileFinder } from '../file/file.finder.js'
import type { FileReader, FileReadResult } from '../file/file.reader.js'
import type { SpecDocumentParser } from '../spec/spec-document.parser.js'
import type { TestFileParser, TestFileParseResult } from '../test/test-file.parser.js'

const UNREADABLE = '<unreadable>'
const SYNTAX_ERROR = '<syntax error>'

const fakeFinder = (pathsByPattern: Record<string, string[]>): FileFinder => ({
  find: async (pattern) => pathsByPattern[pattern] ?? [],
})

const fakeReader = (contentByPath: Record<string, string>): FileReader => ({
  read: async (path) => {
    const content = contentByPath[path] ?? ''
    return content === UNREADABLE ? { kind: 'read-error', message: `cannot read ${path}` } : { kind: 'read', content }
  },
})

const fakeSpecParser: SpecDocumentParser = {
  parse: (content) => ({
    comments: content.split('\n').map((body, index) => ({
      line: index + 1,
      body,
      placement: { kind: 'first-paragraph-end', itemLine: index + 1, text: '' },
    })),
  }),
}

const fakeTestParser: TestFileParser = {
  parse: (path, content) => {
    if (!path.endsWith('.ts'))
      return { kind: 'unsupported-extension', extension: path.slice(path.lastIndexOf('.')), supportedExtensions: ['.ts'] }
    if (content === SYNTAX_ERROR) return { kind: 'syntax-error', messages: ['unexpected token'] }
    const bodies = content.split('\n')
    const comments = bodies.map((body, index) => ({
      line: 2 * index + 1,
      endLine: 2 * index + 1,
      body,
      style: 'line' as const,
      hasCodeOnLine: false,
    }))
    return { kind: 'parsed', comments, testUnits: bodies.map((_, index) => ({ line: 2 * index + 2 })) }
  },
}

const DEFAULT_INPUT: CoverageCheckInput = { specPatterns: ['specs'], testPatterns: ['tests'] }

const runUsecase = (
  pathsByPattern: Record<string, string[]>,
  contentByPath: Record<string, string>,
  input: CoverageCheckInput = DEFAULT_INPUT,
  reader: FileReader = fakeReader(contentByPath),
  testParser: TestFileParser = fakeTestParser,
) => new CoverageCheckUsecase(fakeFinder(pathsByPattern), reader, fakeSpecParser, testParser).run(input)

const run = async (pathsByPattern: Record<string, string[]>, contentByPath: Record<string, string>): Promise<CheckedCoverage> => {
  const result = await runUsecase(pathsByPattern, contentByPath)
  if (result.kind !== 'checked') throw new Error(`Expected a checked result, got ${result.kind}`)
  return result
}

const uncoveredSpecPathsOf = (result: CheckedCoverage) =>
  result.coverage.problems.flatMap((problem) => (problem.kind === 'uncovered-spec' ? [problem.specItem.location.path] : []))

// nocap: CC-001
describe('명세 패턴의 파일은 명세 문서로, 테스트 패턴의 파일은 테스트 파일로 읽음', () => {
  it('명세 패턴의 파일에 있는 명세 항목이 테스트 패턴의 파일에 있는 테스트 항목과 연결된다', async () => {
    const result = await run({ specs: ['a.md'], tests: ['a.test.ts'] }, { 'a.md': 'nocap: A-001', 'a.test.ts': 'nocap: A-001' })

    expect([result.coverage.specCount, result.coverage.coveredSpecCount]).toEqual([1, 1])
  })
})

// nocap: CC-003
describe('같은 쪽 패턴 여러 개에 맞는 파일은 한 번만 읽음', () => {
  it('테스트 파일이 테스트 패턴 2개에 맞아도 그 파일의 테스트 항목은 1번만 판정에 들어간다', async () => {
    const result = await run({ specs: ['empty.md'], tests: ['a.test.ts', 'a.test.ts'] }, { 'a.test.ts': 'nocap: A-999' })

    expect(result.coverage.problems.map((problem) => (problem.kind === 'unknown-id' ? problem.testItems.length : problem.kind))).toEqual([
      1,
    ])
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

    expect(result.fileErrors).toEqual([{ kind: 'unsupported-extension', path: 'a.md', extension: '.md', supportedExtensions: ['.ts'] }])
  })
})

// nocap: CC-010
describe('파일을 하나도 찾지 못한 명세 패턴과 테스트 패턴을 모두 보고', () => {
  const pathsByPattern = { specs: ['a.md'], tests: ['a.test.ts'], 'no-spec': [], 'no-test': [] }

  it('모든 패턴이 파일을 찾으면 판정한 결과를 반환한다', async () => {
    expect((await runUsecase(pathsByPattern, {})).kind).toBe('checked')
  })

  it('파일을 찾지 못한 명세 패턴과 테스트 패턴이 있으면 명세 패턴, 테스트 패턴 순서로 각각 쓴 순서대로 반환한다', async () => {
    const result = await runUsecase(
      pathsByPattern,
      {},
      { specPatterns: ['no-spec', 'specs', 'missing'], testPatterns: ['tests', 'no-test'] },
    )

    expect(result).toEqual({
      kind: 'unmatched-patterns',
      patterns: [
        { side: 'spec', pattern: 'no-spec' },
        { side: 'spec', pattern: 'missing' },
        { side: 'test', pattern: 'no-test' },
      ],
    })
  })

  it('파일을 찾지 못한 패턴을 두 번 쓰면 한 번만 반환한다', async () => {
    const result = await runUsecase(pathsByPattern, {}, { specPatterns: ['no-spec', 'no-spec'], testPatterns: ['tests'] })

    expect(result).toEqual({ kind: 'unmatched-patterns', patterns: [{ side: 'spec', pattern: 'no-spec' }] })
  })

  it('파일을 찾지 못한 패턴이 있으면 찾은 파일도 읽지 않는다', async () => {
    const readPaths: string[] = []
    const reader: FileReader = {
      read: async (path) => {
        readPaths.push(path)
        return { kind: 'read', content: '' }
      },
    }

    await runUsecase(pathsByPattern, {}, { specPatterns: ['specs'], testPatterns: ['no-test'] }, reader)

    expect(readPaths).toEqual([])
  })
})

// nocap: CC-006
describe('읽지 못한 파일을 경로와 함께 보고', () => {
  it('읽지 못한 파일이 있으면 그 경로와 오류 메시지를 보고한다', async () => {
    const result = await run({ specs: ['a.md'], tests: ['empty.test.ts'] }, { 'a.md': UNREADABLE })

    expect(result.fileErrors).toEqual([{ kind: 'read-error', path: 'a.md', message: 'cannot read a.md' }])
  })
})

// nocap: CC-007
describe('지원하지 않는 확장자와 문법 오류를 테스트 파일의 경로와 함께 보고', () => {
  it('지원하지 않는 확장자의 테스트 파일이 있으면 그 경로와 확장자를 보고한다', async () => {
    const result = await run({ specs: ['empty.md'], tests: ['a.py'] }, { 'a.py': '' })

    expect(result.fileErrors).toEqual([{ kind: 'unsupported-extension', path: 'a.py', extension: '.py', supportedExtensions: ['.ts'] }])
  })

  it('문법 오류가 있는 테스트 파일이 있으면 그 경로와 오류 메시지를 보고한다', async () => {
    const result = await run({ specs: ['empty.md'], tests: ['a.test.ts'] }, { 'a.test.ts': SYNTAX_ERROR })

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

    expect(result.coverage.coveredSpecCount).toBe(1)
  })
})

// nocap: CC-009
describe('경로의 코드 단위 순서대로 파일을 판정 결과에 반영', () => {
  it('찾은 순서와 관계없이 대문자로 시작하는 경로의 명세 항목이 먼저 온다', async () => {
    const result = await run({ specs: ['a.md', 'B.md'], tests: ['empty.test.ts'] }, { 'a.md': 'nocap: A-001', 'B.md': 'nocap: B-001' })

    expect(uncoveredSpecPathsOf(result)).toEqual(['B.md', 'a.md'])
  })
})

describe('포트 결과에 있는 남는 필드', () => {
  // A port result can hold fields that its type does not declare, for example after a type assertion in an adapter.
  const fileErrorsOf = async (reader: FileReader, testParser: TestFileParser) => {
    const result = await runUsecase({ specs: ['a.md'], tests: ['a.test.ts'] }, {}, DEFAULT_INPUT, reader, testParser)
    if (result.kind !== 'checked') throw new Error(`Expected a checked result, got ${result.kind}`)
    return result.fileErrors
  }

  it('파일 읽기 결과에 타입에 없는 필드가 있어도 파일 오류에 담지 않는다', async () => {
    const reader: FileReader = {
      read: async (path) =>
        path === 'a.md' ? ({ kind: 'read-error', message: 'EACCES', internal: 1 } as FileReadResult) : { kind: 'read', content: '' },
    }

    expect(await fileErrorsOf(reader, fakeTestParser)).toStrictEqual([{ kind: 'read-error', path: 'a.md', message: 'EACCES' }])
  })

  it('테스트 파일 파서 결과에 타입에 없는 필드가 있어도 파일 오류에 담지 않는다', async () => {
    const testParser: TestFileParser = {
      parse: () => ({ kind: 'syntax-error', messages: ['unexpected token'], internal: 1 }) as TestFileParseResult,
    }

    expect(await fileErrorsOf(fakeReader({}), testParser)).toStrictEqual([
      { kind: 'syntax-error', path: 'a.test.ts', messages: ['unexpected token'] },
    ])
  })
})

describe('틀린 태그', () => {
  it('명세 문서의 틀린 태그를 결과에 담는다', async () => {
    const result = await run({ specs: ['a.md'], tests: ['empty.test.ts'] }, { 'a.md': 'nocap: A.1' })

    expect(result.invalidTags).toEqual([
      {
        kind: 'id-rule-violation',
        location: { path: 'a.md', line: 1 },
        invalidCandidate: { kind: 'invalid-char', value: 'A.1', firstInvalidChar: '.' },
      },
    ])
  })
})

describe('빈 입력', () => {
  it('찾은 파일이 모두 비어 있으면 모든 목록이 비어 있다', async () => {
    const result = await run({ specs: ['empty.md'], tests: ['empty.test.ts'] }, {})

    expect([result.coverage.specCount, result.coverage.problems, result.invalidTags, result.fileErrors]).toEqual([0, [], [], []])
  })
})
