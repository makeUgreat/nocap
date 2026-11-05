import { afterEach, describe, expect, it, vi } from 'vitest'
import * as entry from '../../src/index.js'
import { checkCoverage } from '../../src/index.js'
import { projectWith } from '../support/project.support.js'

const patterns = { spec: ['docs/**/*.md'], test: ['src/**/*.test.ts'] } as const

afterEach(() => {
  vi.restoreAllMocks()
})

const checkedIn = async (cwd: string) => {
  const result = await checkCoverage({ ...patterns, cwd })
  if (result.kind !== 'checked') throw new Error(`expected a checked result: ${JSON.stringify(result)}`)
  return result
}

// nocap: LIB-001
describe('패키지 진입점에서 checkCoverage를 내보냄', () => {
  it('패키지 진입점은 async 함수 checkCoverage를 내보낸다', async () => {
    const result = entry.checkCoverage({ ...patterns, cwd: projectWith({ 'docs/a.md': '', 'src/a.test.ts': '' }) })

    expect([Object.keys(entry), result instanceof Promise]).toEqual([['checkCoverage'], true])
    await result
  })
})

// nocap: LIB-002
describe('spec 패턴으로 명세 문서를, test 패턴으로 테스트 파일을 찾음', () => {
  it('패턴에 맞는 파일만 읽어 명세 항목과 테스트 항목을 연결한다', async () => {
    const dir = projectWith({
      'docs/auth.md': '- 5회 실패하면 잠금 <!-- nocap: A-001 -->',
      'notes/draft.md': '- 초안 <!-- nocap: B-001 -->',
      'src/auth.test.ts': ['// nocap: A-001', "it('잠근다', () => {})"].join('\n'),
      'e2e/auth.test.ts': ['// nocap: A-001', "it('잠근다', () => {})"].join('\n'),
    })

    const result = await checkedIn(dir)

    expect(result.specItems.map(({ id, testItems }) => [id, testItems])).toEqual([
      ['A-001', [{ location: { path: 'src/auth.test.ts', line: 2 } }]],
    ])
  })
})

// nocap: LIB-006
describe('파일을 찾지 못한 패턴이 있으면 unmatched-patterns 결과', () => {
  it('명세 패턴이 파일을 찾지 못하면 그 패턴을 담은 unmatched-patterns 결과를 돌려준다', async () => {
    const dir = projectWith({ 'docs/auth.md': '', 'src/auth.test.ts': '' })

    const result = await checkCoverage({ spec: ['dcos/*.md'], test: ['src/*.test.ts'], cwd: dir })

    expect(result).toEqual({ kind: 'unmatched-patterns', patterns: [{ side: 'spec', pattern: 'dcos/*.md' }] })
  })
})

// nocap: LIB-007
describe('unmatched-patterns 결과의 패턴 순서', () => {
  it('명세 패턴을 먼저, 테스트 패턴을 나중에 받은 순서대로 넣고 같은 패턴은 1번만 넣는다', async () => {
    const dir = projectWith({ 'docs/auth.md': '' })

    const result = await checkCoverage({ spec: ['b/*.md', 'a/*.md', 'b/*.md'], test: ['t/*.ts'], cwd: dir })

    expect(result).toEqual({
      kind: 'unmatched-patterns',
      patterns: [
        { side: 'spec', pattern: 'b/*.md' },
        { side: 'spec', pattern: 'a/*.md' },
        { side: 'test', pattern: 't/*.ts' },
      ],
    })
  })
})

// nocap: LIB-008
describe('모든 패턴이 파일을 찾으면 checked 결과', () => {
  it('checked 결과는 명세 항목 수, 커버된 명세 항목 수, 문제 목록 3개, 명세 항목 목록을 가진다', async () => {
    const dir = projectWith({
      'docs/auth.md': ['- 5회 실패하면 잠금 <!-- nocap: A-001 -->', '- 30분 후 풀림 <!-- nocap: A-002 -->'].join('\n'),
      'src/auth.test.ts': ['// nocap: A-001', "it('잠근다', () => {})"].join('\n'),
    })

    expect(await checkCoverage({ ...patterns, cwd: dir })).toEqual({
      kind: 'checked',
      specCount: 2,
      coveredSpecCount: 1,
      coverageProblems: [{ kind: 'uncovered-spec', id: 'A-002', location: { path: 'docs/auth.md', line: 2 }, text: '30분 후 풀림' }],
      invalidTags: [],
      fileErrors: [],
      specItems: [
        {
          id: 'A-001',
          text: '5회 실패하면 잠금',
          location: { path: 'docs/auth.md', line: 1 },
          status: 'covered',
          testItems: [{ location: { path: 'src/auth.test.ts', line: 2 } }],
        },
        { id: 'A-002', text: '30분 후 풀림', location: { path: 'docs/auth.md', line: 2 }, status: 'uncovered-spec', testItems: [] },
      ],
    })
  })
})

// nocap: LIB-009
describe('specItems에 모든 명세 항목을 넣음', () => {
  it('커버된 항목, 커버되지 않은 항목, 중복 ID 항목이 섞여 있어도 specItems의 길이는 명세 항목 수와 같다', async () => {
    const dir = projectWith({
      'docs/a.md': ['- 하나 <!-- nocap: A-001 -->', '- 둘 <!-- nocap: A-002 -->', '- 셋 <!-- nocap: A-003 -->'].join('\n'),
      'docs/b.md': '- 넷 <!-- nocap: A-003 -->',
      'src/a.test.ts': ['// nocap: A-001', "it('하나', () => {})"].join('\n'),
    })

    const result = await checkedIn(dir)

    expect([result.specItems.length, result.specCount]).toEqual([4, 4])
  })
})

// nocap: LIB-010
describe('명세 항목마다 ID, 명세 문장, 위치, 상태, 연결된 테스트 항목 목록을 줌', () => {
  it('명세 항목은 id, text, location, status, testItems 필드를 가진다', async () => {
    const dir = projectWith({ 'docs/a.md': '- 하나 <!-- nocap: A-001 -->', 'src/a.test.ts': '' })

    const [specItem] = (await checkedIn(dir)).specItems

    expect(Object.keys(specItem ?? {}).sort()).toEqual(['id', 'location', 'status', 'testItems', 'text'])
  })
})

// nocap: LIB-011
describe('커버된 명세 항목의 상태는 covered', () => {
  it('ID를 가리키는 테스트 항목이 있으면 상태가 covered다', async () => {
    const dir = projectWith({
      'docs/a.md': '- 하나 <!-- nocap: A-001 -->',
      'src/a.test.ts': ['// nocap: A-001', "it('하나', () => {})"].join('\n'),
    })

    expect((await checkedIn(dir)).specItems.map(({ status }) => status)).toEqual(['covered'])
  })
})

// nocap: LIB-012
describe('커버되지 않은 명세 항목의 상태는 uncovered-spec', () => {
  it('ID를 가리키는 테스트 항목이 없으면 상태가 uncovered-spec이고 testItems가 비어 있다', async () => {
    const dir = projectWith({ 'docs/a.md': '- 하나 <!-- nocap: A-001 -->', 'src/a.test.ts': '' })

    expect((await checkedIn(dir)).specItems.map(({ status, testItems }) => [status, testItems])).toEqual([['uncovered-spec', []]])
  })
})

// nocap: LIB-013
describe('ID가 같은 명세 항목의 상태는 duplicate-id이고 testItems는 비어 있음', () => {
  it('ID가 같은 명세 항목 2개를 가리키는 테스트가 있어도 두 항목 모두 duplicate-id이고 testItems가 비어 있다', async () => {
    const dir = projectWith({
      'docs/auth.md': '- 잠금 <!-- nocap: A-001 -->',
      'docs/login.md': '- 비밀번호 <!-- nocap: A-001 -->',
      'src/a.test.ts': ['// nocap: A-001', "it('잠근다', () => {})"].join('\n'),
    })

    expect((await checkedIn(dir)).specItems.map(({ status, testItems }) => [status, testItems])).toEqual([
      ['duplicate-id', []],
      ['duplicate-id', []],
    ])
  })
})

// nocap: LIB-014
describe('covered 명세 항목의 testItems에 그 ID를 가리키는 테스트 항목을 모두 넣음', () => {
  it('ID를 가리키는 테스트 항목이 파일 2개에 3개 있으면 3개의 위치를 모두 넣는다', async () => {
    const dir = projectWith({
      'docs/a.md': '- 하나 <!-- nocap: A-001 -->',
      'src/a.test.ts': ['// nocap: A-001', "it('하나', () => {})", '', '// nocap: A-001', "it('둘', () => {})"].join('\n'),
      'src/b.test.ts': ['// nocap: A-001', "it('셋', () => {})"].join('\n'),
    })

    expect((await checkedIn(dir)).specItems[0]?.testItems).toEqual([
      { location: { path: 'src/a.test.ts', line: 2 } },
      { location: { path: 'src/a.test.ts', line: 5 } },
      { location: { path: 'src/b.test.ts', line: 2 } },
    ])
  })
})

// nocap: LIB-015
describe('specItems는 경로의 코드 단위 순서, 같은 경로 안에서는 줄 순서', () => {
  it('docs/B.md의 명세 항목이 docs/a.md의 명세 항목보다 앞서고 같은 문서 안에서는 줄 순서다', async () => {
    const dir = projectWith({
      // A-002 is above A-001, so the order is by line, not by id.
      'docs/a.md': ['- 첫째 줄 <!-- nocap: A-002 -->', '- 둘째 줄 <!-- nocap: A-001 -->'].join('\n'),
      'docs/B.md': '- B <!-- nocap: B-001 -->',
      'src/a.test.ts': '',
    })

    expect((await checkedIn(dir)).specItems.map(({ location }) => `${location.path}:${location.line}`)).toEqual([
      'docs/B.md:1',
      'docs/a.md:1',
      'docs/a.md:2',
    ])
  })
})

// nocap: LIB-016
describe('testItems는 경로의 코드 단위 순서, 같은 경로 안에서는 줄 순서', () => {
  it('src/e2e.test.ts보다 src/auth.test.ts의 테스트 항목이 앞서고 같은 파일 안에서는 줄 순서다', async () => {
    const dir = projectWith({
      'docs/a.md': '- 하나 <!-- nocap: A-001 -->',
      'src/e2e.test.ts': ['// nocap: A-001', "it('e2e', () => {})"].join('\n'),
      'src/auth.test.ts': ['// nocap: A-001', "it('첫째', () => {})", '', '// nocap: A-001', "it('둘째', () => {})"].join('\n'),
    })

    expect((await checkedIn(dir)).specItems[0]?.testItems.map(({ location }) => `${location.path}:${location.line}`)).toEqual([
      'src/auth.test.ts:2',
      'src/auth.test.ts:5',
      'src/e2e.test.ts:2',
    ])
  })
})

// nocap: LIB-017
describe('실행하는 동안 stdout과 stderr에 아무것도 쓰지 않음', () => {
  it('커버리지 문제, 틀린 태그, 파일 오류가 있어도 stdout과 stderr에 쓰지 않는다', async () => {
    const stdout = vi.spyOn(process.stdout, 'write')
    const stderr = vi.spyOn(process.stderr, 'write')
    const dir = projectWith({
      'docs/a.md': ['- 하나 <!-- nocap: A-001 -->', '- 둘 <!-- nocap: A.2 -->'].join('\n'),
      'src/a.test.ts': 'it(',
    })

    const result = await checkedIn(dir)

    expect([
      result.coverageProblems.length,
      result.invalidTags.length,
      result.fileErrors.length,
      stdout.mock.calls,
      stderr.mock.calls,
    ]).toEqual([1, 1, 1, [], []])
  })
})
