import { describe, expect, it } from 'vitest'
import { Coverage } from '../../domain/coverage/coverage.js'
import { SpecDocument } from '../../domain/spec/spec-document.js'
import { SpecItem } from '../../domain/spec/spec-item.js'
import { TestFile } from '../../domain/test/test-file.js'
import type { TestItem } from '../../domain/test/test-item.js'
import { CoverageCheckResult } from './coverage-check.result.js'

const spec = (id: string, path: string, line: number, text = ''): SpecItem => {
  const result = SpecItem.parse(path, { line, body: `nocap: ${id}`, placement: { kind: 'first-paragraph-end', itemLine: line, text } })
  if (result.kind !== 'valid') throw new Error(`not a spec item in fixture: ${id}`)
  return result.item
}
const lineComment = (line: number, body: string) => ({ line, endLine: line, body, style: 'line' as const, hasCodeOnLine: false })
// The tag is on the line above the test unit, so the test item is at `line`.
const test = (id: string, path: string, line: number): TestItem => {
  const [item] = TestFile.of(path, [lineComment(line - 1, `nocap: ${id}`)], [{ line }]).testItems
  if (item === undefined) throw new Error(`not a test item in fixture: ${id}`)
  return item
}
const specComment = (line: number, body: string) => ({
  line,
  body,
  placement: { kind: 'first-paragraph-end' as const, itemLine: line, text: '' },
})
const fromItems = (specItems: SpecItem[], testItems: TestItem[]) =>
  CoverageCheckResult.fromDomain({ coverage: Coverage.of({ specItems, testItems }), invalidTags: [], fileErrors: [] })
const emptyResult = (data: Partial<Parameters<typeof CoverageCheckResult.of>[0]>) =>
  CoverageCheckResult.of({ specCount: 0, coveredSpecCount: 0, coverageProblems: [], invalidTags: [], fileErrors: [], ...data })

describe('도메인 결과를 출력 타입으로 바꿈', () => {
  describe('fromDomain', () => {
    it('커버되지 않은 명세 항목이면 ID 문자열, 위치, 명세 문장을 담는다', () => {
      const result = fromItems([spec('A-001', 'a.md', 3, '잠금')], [])

      expect(result.coverageProblems).toEqual([{ kind: 'uncovered-spec', id: 'A-001', location: { path: 'a.md', line: 3 }, text: '잠금' }])
    })

    it('알 수 없는 ID이면 그 ID를 가리키는 테스트 항목의 위치를 순서대로 담는다', () => {
      const result = fromItems([], [test('A-999', 'a.test.ts', 1), test('A-999', 'b.test.ts', 2)])

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

    it('중복 ID이면 그 ID를 가진 명세 항목의 위치를 순서대로 담는다', () => {
      const result = fromItems([spec('A-001', 'a.md', 1), spec('A-001', 'b.md', 2)], [])

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

    it('명세 항목 수와 커버된 명세 항목 수를 그대로 담는다', () => {
      const result = fromItems([spec('A-001', 'a.md', 1), spec('A-002', 'a.md', 2)], [test('A-001', 'a.test.ts', 1)])

      expect([result.specCount, result.coveredSpecCount]).toEqual([2, 1])
    })

    it('ID 규칙 위반이면 위치와 규칙을 어긴 ID 후보를 담는다', () => {
      const { invalidTags } = TestFile.of('a.test.ts', [lineComment(1, 'nocap: B C')], [{ line: 2 }])

      const result = CoverageCheckResult.fromDomain({
        coverage: Coverage.of({ specItems: [], testItems: [] }),
        invalidTags,
        fileErrors: [],
      })

      expect(result.invalidTags).toEqual([
        {
          kind: 'id-rule-violation',
          location: { path: 'a.test.ts', line: 1 },
          invalidCandidate: { kind: 'invalid-whitespace', value: 'B C' },
        },
      ])
    })

    it('ID 개수 초과이면 쉼표로 나눈 값들을 담는다', () => {
      const { invalidTags } = SpecDocument.of('a.md', [specComment(4, 'nocap: A-001, A-002')])

      const result = CoverageCheckResult.fromDomain({
        coverage: Coverage.of({ specItems: [], testItems: [] }),
        invalidTags,
        fileErrors: [],
      })

      expect(result.invalidTags).toEqual([{ kind: 'multiple-ids', location: { path: 'a.md', line: 4 }, values: ['A-001', 'A-002'] }])
    })

    it('ID 누락이면 위치만 담는다', () => {
      const { invalidTags } = TestFile.of('a.test.ts', [lineComment(1, 'nocap:')], [{ line: 2 }])

      const result = CoverageCheckResult.fromDomain({
        coverage: Coverage.of({ specItems: [], testItems: [] }),
        invalidTags,
        fileErrors: [],
      })

      expect(result.invalidTags).toEqual([{ kind: 'missing-id', location: { path: 'a.test.ts', line: 1 } }])
    })

    it('같은 ID 반복이면 ID 문자열과 첫 태그의 줄을 담는다', () => {
      const { invalidTags } = TestFile.of('a.test.ts', [lineComment(1, 'nocap: A-001'), lineComment(2, 'nocap: A-001')], [{ line: 3 }])

      const result = CoverageCheckResult.fromDomain({
        coverage: Coverage.of({ specItems: [], testItems: [] }),
        invalidTags,
        fileErrors: [],
      })

      expect(result.invalidTags).toEqual([{ kind: 'repeated-id', location: { path: 'a.test.ts', line: 2 }, id: 'A-001', firstTagLine: 1 }])
    })

    it('위치 위반이면 위치와 위치 이유만 담는다', () => {
      const { invalidTags } = SpecDocument.of('a.md', [{ line: 5, body: 'nocap: A-001', placement: { kind: 'first-block' } }])

      const result = CoverageCheckResult.fromDomain({
        coverage: Coverage.of({ specItems: [], testItems: [] }),
        invalidTags,
        fileErrors: [],
      })

      expect(result.invalidTags).toEqual([{ kind: 'no-sentence', location: { path: 'a.md', line: 5 } }])
    })
  })
})

describe('문제가 있는지', () => {
  it('모든 목록이 비어 있으면 거짓을 반환한다', () => {
    expect(emptyResult({}).hasProblems()).toBe(false)
  })

  it('커버리지 문제가 있으면 참을 반환한다', () => {
    const result = emptyResult({
      coverageProblems: [{ kind: 'uncovered-spec', id: 'A-001', location: { path: 'a.md', line: 1 }, text: '' }],
    })

    expect(result.hasProblems()).toBe(true)
  })

  it('틀린 태그만 있어도 참을 반환한다', () => {
    expect(emptyResult({ invalidTags: [{ kind: 'missing-id', location: { path: 'a.md', line: 1 } }] }).hasProblems()).toBe(true)
  })

  it('파일 오류만 있어도 참을 반환한다', () => {
    expect(emptyResult({ fileErrors: [{ kind: 'read-error', path: 'a.md', message: 'x' }] }).hasProblems()).toBe(true)
  })
})

describe('모든 명세 항목이 커버되었는지', () => {
  it('커버된 명세 항목 수가 전체와 같으면 참을 반환한다', () => {
    expect(emptyResult({ specCount: 2, coveredSpecCount: 2 }).isFullyCovered()).toBe(true)
  })

  it('커버된 명세 항목 수가 전체보다 적으면 거짓을 반환한다', () => {
    expect(emptyResult({ specCount: 2, coveredSpecCount: 1 }).isFullyCovered()).toBe(false)
  })
})
