import { describe, expect, it } from 'vitest'
import { Coverage } from './coverage.js'
import { SpecItem } from '../spec/spec-item.js'
import { TestFile } from '../test/test-file.js'
import type { TestItem } from '../test/test-item.js'

const spec = (id: string, path = 'a.md'): SpecItem => {
  const result = SpecItem.parse(path, { line: 1, body: `nocap: ${id}`, placement: { kind: 'first-paragraph-end', itemLine: 1, text: '' } })
  if (result.kind !== 'valid') throw new Error(`not a spec item in fixture: ${id}`)
  return result.item
}
// `ids` is written like "A-001, A-002". Each id becomes its own test tag line above the test unit.
const test = (ids: string, path = 'a.test.ts'): TestItem => {
  const comments = ids
    .split(', ')
    .map((id, index) => ({ line: index + 1, endLine: index + 1, body: `nocap: ${id}`, style: 'line' as const, hasCodeOnLine: false }))
  const [item] = TestFile.of(path, comments, [{ line: comments.length + 1 }]).testItems
  if (item === undefined) throw new Error(`not a test item in fixture: ${ids}`)
  return item
}
const kindsOf = (coverage: Coverage) => coverage.problems.map((problem) => problem.kind)

// nocap: CV-001
describe('가리키는 테스트 항목이 1개 이상이면 커버됨', () => {
  it('명세 항목의 ID를 가리키는 테스트 항목이 있으면 커버된 명세 항목으로 세고 문제를 보고하지 않는다', () => {
    const coverage = Coverage.of({ specItems: [spec('A-001')], testItems: [test('A-001')] })

    expect([coverage.coveredSpecCount, coverage.problems]).toEqual([1, []])
  })
})

// nocap: CV-002
describe('가리키는 테스트 항목이 없으면 커버되지 않음', () => {
  it('명세 항목의 ID를 가리키는 테스트 항목이 없으면 그 명세 항목을 커버되지 않은 명세로 보고한다', () => {
    const specItem = spec('A-001')

    const coverage = Coverage.of({ specItems: [specItem], testItems: [] })

    expect([coverage.coveredSpecCount, coverage.problems]).toEqual([0, [{ kind: 'uncovered-spec', specItem }]])
  })
})

// nocap: CV-003
describe('테스트 항목 1개가 가리키는 ID마다 명세 항목을 커버함', () => {
  it('테스트 항목 1개가 ID 2개를 가리키면 두 명세 항목을 모두 커버된 명세 항목으로 센다', () => {
    const coverage = Coverage.of({ specItems: [spec('A-001'), spec('A-002')], testItems: [test('A-001, A-002')] })

    expect([coverage.coveredSpecCount, coverage.problems]).toEqual([2, []])
  })

  it('테스트 항목이 알 수 없는 ID를 함께 가리켜도 나머지 ID의 명세 항목은 커버된 명세 항목으로 센다', () => {
    const coverage = Coverage.of({ specItems: [spec('A-001')], testItems: [test('A-001, A-999')] })

    expect([coverage.coveredSpecCount, kindsOf(coverage)]).toEqual([1, ['unknown-id']])
  })
})

// nocap: CV-004
describe('테스트 파일의 경로와 관계없이 커버됨', () => {
  it('명세 문서와 디렉터리가 다른 테스트 파일의 테스트 항목만 있어도 커버된 명세 항목으로 센다', () => {
    const coverage = Coverage.of({
      specItems: [spec('AUTH-001', 'docs/specs/auth.md')],
      testItems: [test('AUTH-001', 'e2e/login.test.ts')],
    })

    expect([coverage.coveredSpecCount, coverage.problems]).toEqual([1, []])
  })
})

// nocap: CV-005
describe('ID는 문자열이 정확히 같을 때만 같은 ID', () => {
  it('대소문자만 다른 ID를 가리키는 테스트 항목은 명세 항목을 커버하지 않는다', () => {
    const coverage = Coverage.of({ specItems: [spec('AUTH-001')], testItems: [test('auth-001')] })

    expect([coverage.coveredSpecCount, kindsOf(coverage)]).toEqual([0, ['uncovered-spec', 'unknown-id']])
  })
})

// nocap: CV-006
describe('어떤 명세 항목에도 없는 ID와 그 ID를 가리키는 테스트 항목을 보고', () => {
  it('명세 항목에 없는 ID를 가리키는 테스트 항목이 있으면 그 ID와 테스트 항목을 보고한다', () => {
    const testItem = test('A-999')

    const coverage = Coverage.of({ specItems: [], testItems: [testItem] })

    expect(coverage.problems).toEqual([{ kind: 'unknown-id', id: testItem.ids.values[0], testItems: [testItem] }])
  })

  it('같은 알 수 없는 ID를 가리키는 테스트 항목이 2개이면 ID 1개에 두 테스트 항목을 보고한다', () => {
    const first = test('A-999', 'a.test.ts')
    const second = test('A-999', 'b.test.ts')

    const coverage = Coverage.of({ specItems: [], testItems: [first, second] })

    expect(coverage.problems).toEqual([{ kind: 'unknown-id', id: first.ids.values[0], testItems: [first, second] }])
  })

  it('모든 ID가 명세 항목에 있으면 알 수 없는 ID를 보고하지 않는다', () => {
    expect(kindsOf(Coverage.of({ specItems: [spec('A-001')], testItems: [test('A-001')] }))).toEqual([])
  })
})

// nocap: CV-007
describe('ID가 같은 명세 항목이 2개 이상이면 그 ID와 명세 항목을 모두 보고', () => {
  it('ID가 같은 명세 항목이 2개이면 그 ID와 두 명세 항목을 보고한다', () => {
    const first = spec('A-001', 'a.md')
    const second = spec('A-001', 'b.md')

    const coverage = Coverage.of({ specItems: [first, second], testItems: [test('A-001')] })

    expect(coverage.problems).toEqual([{ kind: 'duplicate-id', id: first.id, specItems: [first, second] }])
  })

  it('명세 항목의 ID가 모두 다르면 중복 ID를 보고하지 않는다', () => {
    expect(kindsOf(Coverage.of({ specItems: [spec('A-001'), spec('A-002')], testItems: [test('A-001, A-002')] }))).toEqual([])
  })
})

// nocap: CV-008
describe('ID가 같은 명세 항목은 커버 여부를 판정하지 않음', () => {
  it('ID가 같은 명세 항목을 가리키는 테스트 항목이 있어도 커버된 명세 항목으로 세지 않는다', () => {
    const coverage = Coverage.of({ specItems: [spec('A-001', 'a.md'), spec('A-001', 'b.md')], testItems: [test('A-001')] })

    expect([coverage.specCount, coverage.coveredSpecCount]).toEqual([2, 0])
  })

  it('ID가 같은 명세 항목을 가리키는 테스트 항목이 없어도 커버되지 않은 명세로 보고하지 않는다', () => {
    const coverage = Coverage.of({ specItems: [spec('A-001', 'a.md'), spec('A-001', 'b.md')], testItems: [] })

    expect(kindsOf(coverage)).toEqual(['duplicate-id'])
  })
})

describe('빈 입력', () => {
  it('명세 항목과 테스트 항목이 모두 없으면 명세 항목 수가 0이고 문제가 없다', () => {
    const coverage = Coverage.of({ specItems: [], testItems: [] })

    expect([coverage.specCount, coverage.coveredSpecCount, coverage.problems]).toEqual([0, 0, []])
  })
})

describe('문제 순서', () => {
  it('명세 쪽 문제는 그 ID가 명세 항목에서 처음 나온 순서이고, 알 수 없는 ID는 그 뒤에 테스트 항목에서 처음 나온 순서다', () => {
    const coverage = Coverage.of({
      specItems: [spec('A-001'), spec('A-002', 'a.md'), spec('A-003'), spec('A-002', 'b.md')],
      testItems: [test('A-001'), test('A-999'), test('A-777, A-999')],
    })

    const idsOf = coverage.problems.map((problem) => (problem.kind === 'uncovered-spec' ? problem.specItem.id.value : problem.id.value))
    expect([kindsOf(coverage), idsOf]).toEqual([
      ['duplicate-id', 'uncovered-spec', 'unknown-id', 'unknown-id'],
      ['A-002', 'A-003', 'A-999', 'A-777'],
    ])
  })
})

describe('명세 항목마다 판정', () => {
  it('ID를 가리키는 테스트 항목이 있으면 그 명세 항목을 커버됨으로 판정하고 테스트 항목을 받은 순서대로 담는다', () => {
    const specItem = spec('A-001')
    const first = test('A-001', 'a.test.ts')
    const second = test('A-001', 'b.test.ts')

    const coverage = Coverage.of({ specItems: [specItem], testItems: [first, second] })

    expect(coverage.specJudgments).toEqual([{ kind: 'covered', specItem, testItems: [first, second] }])
  })

  it('ID를 가리키는 테스트 항목이 없으면 그 명세 항목을 커버되지 않음으로 판정한다', () => {
    const specItem = spec('A-001')

    const coverage = Coverage.of({ specItems: [specItem], testItems: [test('A-999')] })

    expect(coverage.specJudgments).toEqual([{ kind: 'uncovered-spec', specItem }])
  })

  it('ID가 같은 명세 항목이 2개이면 테스트 항목이 있어도 두 명세 항목을 모두 중복 ID로 판정한다', () => {
    const first = spec('A-001', 'a.md')
    const second = spec('A-001', 'b.md')

    const coverage = Coverage.of({ specItems: [first, second], testItems: [test('A-001')] })

    expect(coverage.specJudgments).toEqual([
      { kind: 'duplicate-id', specItem: first },
      { kind: 'duplicate-id', specItem: second },
    ])
  })

  it('명세 항목을 받은 순서대로 판정을 담는다', () => {
    const coverage = Coverage.of({ specItems: [spec('B-001'), spec('A-001')], testItems: [] })

    expect(coverage.specJudgments.map(({ specItem }) => specItem.id.value)).toEqual(['B-001', 'A-001'])
  })
})
