import { describe, expect, it } from 'vitest'
import { CoverageJudge } from './coverage.judge.js'
import type { SpecItem } from './spec-item.js'
import type { TestItem } from './test-item.js'

const judge = new CoverageJudge()
const spec = (id: string): SpecItem => ({ id })
const test = (...ids: string[]): TestItem => ({ ids })

// @CV-001
describe('가리키는 테스트 항목이 1개 이상이면 커버됨', () => {
  it('명세 항목의 ID를 가리키는 테스트 항목이 있으면 그 테스트 항목이 연결된다', () => {
    const specItem = spec('A-001')
    const testItem = test('A-001')

    const coverage = judge.judge([specItem], [testItem])

    expect(coverage.specs).toEqual([{ specItem, testItems: [testItem] }])
  })
})

// @CV-002
describe('가리키는 테스트 항목이 없으면 커버되지 않음', () => {
  it('명세 항목의 ID를 가리키는 테스트 항목이 없으면 연결된 테스트 항목이 없다', () => {
    const specItem = spec('A-001')

    const coverage = judge.judge([specItem], [test('A-002')])

    expect(coverage.specs).toEqual([{ specItem, testItems: [] }])
  })
})

// @CV-003
describe('테스트 항목 1개가 가리키는 ID마다 명세 항목을 커버함', () => {
  it('테스트 항목 1개가 ID 2개를 가리키면 두 명세 항목에 모두 연결된다', () => {
    const first = spec('A-001')
    const second = spec('A-002')
    const testItem = test('A-001', 'A-002')

    const coverage = judge.judge([first, second], [testItem])

    expect(coverage.specs).toEqual([
      { specItem: first, testItems: [testItem] },
      { specItem: second, testItems: [testItem] },
    ])
  })

  it('테스트 항목이 알 수 없는 ID를 함께 가리켜도 나머지 ID의 명세 항목에는 연결된다', () => {
    const specItem = spec('A-001')
    const testItem = test('A-001', 'A-999')

    const coverage = judge.judge([specItem], [testItem])

    expect(coverage.specs).toEqual([{ specItem, testItems: [testItem] }])
  })
})

// @CV-004
describe('경로가 다른 테스트 파일의 테스트 항목도 같은 명세 항목에 연결', () => {
  it('같은 ID를 가리키는 테스트 항목이 2개이면 두 테스트 항목이 모두 연결된다', () => {
    const specItem = spec('A-001')
    const unit = test('A-001')
    const e2e = test('A-001')

    const coverage = judge.judge([specItem], [unit, e2e])

    expect(coverage.specs[0]?.testItems).toEqual([unit, e2e])
    expect(coverage.specs[0]?.testItems[0]).toBe(unit)
    expect(coverage.specs[0]?.testItems[1]).toBe(e2e)
  })
})

// @CV-005
describe('ID는 문자열이 정확히 같을 때만 같은 ID', () => {
  it('대소문자만 다른 ID를 가리키는 테스트 항목은 연결되지 않는다', () => {
    const specItem = spec('AUTH-001')

    const coverage = judge.judge([specItem], [test('auth-001')])

    expect(coverage.specs).toEqual([{ specItem, testItems: [] }])
  })
})

// @CV-006
describe('어떤 명세 항목에도 없는 ID와 그 ID를 가리키는 테스트 항목을 보고', () => {
  it('명세 항목에 없는 ID를 가리키는 테스트 항목이 있으면 그 ID와 테스트 항목을 보고한다', () => {
    const testItem = test('A-999')

    const coverage = judge.judge([spec('A-001')], [testItem])

    expect(coverage.unknownIds).toEqual([{ id: 'A-999', testItems: [testItem] }])
  })

  it('모든 ID가 명세 항목에 있으면 알 수 없는 ID가 없다', () => {
    const coverage = judge.judge([spec('A-001')], [test('A-001')])

    expect(coverage.unknownIds).toEqual([])
  })

  it('같은 알 수 없는 ID를 가리키는 테스트 항목이 2개이면 ID 1개에 두 테스트 항목을 보고한다', () => {
    const first = test('A-999')
    const second = test('A-999')

    const coverage = judge.judge([], [first, second])

    expect(coverage.unknownIds).toEqual([{ id: 'A-999', testItems: [first, second] }])
  })
})

// @CV-007
describe('ID가 같은 명세 항목이 2개 이상이면 그 ID와 명세 항목을 모두 보고', () => {
  it('ID가 같은 명세 항목이 2개이면 그 ID와 두 명세 항목을 보고한다', () => {
    const first = spec('A-001')
    const second = spec('A-001')

    const coverage = judge.judge([first, second], [])

    expect(coverage.duplicateIds).toHaveLength(1)
    expect(coverage.duplicateIds[0]?.id).toBe('A-001')
    expect(coverage.duplicateIds[0]?.specItems[0]).toBe(first)
    expect(coverage.duplicateIds[0]?.specItems[1]).toBe(second)
  })

  it('명세 항목의 ID가 모두 다르면 중복 ID가 없다', () => {
    const coverage = judge.judge([spec('A-001'), spec('A-002')], [])

    expect(coverage.duplicateIds).toEqual([])
  })

  it('ID가 같은 명세 항목도 각각 판정 결과를 가진다', () => {
    const first = spec('A-001')
    const second = spec('A-001')
    const testItem = test('A-001')

    const coverage = judge.judge([first, second], [testItem])

    expect(coverage.specs).toEqual([
      { specItem: first, testItems: [testItem] },
      { specItem: second, testItems: [testItem] },
    ])
  })
})

describe('빈 입력', () => {
  it('명세 항목과 테스트 항목이 모두 없으면 모든 목록이 비어 있다', () => {
    expect(judge.judge([], [])).toEqual({ specs: [], unknownIds: [], duplicateIds: [] })
  })
})

describe('결과 순서', () => {
  it('명세 커버리지는 명세 항목을 받은 순서를 따른다', () => {
    const coverage = judge.judge([spec('A-010'), spec('A-002')], [])

    expect(coverage.specs.map((entry) => entry.specItem.id)).toEqual(['A-010', 'A-002'])
  })

  it('알 수 없는 ID는 테스트 항목에서 처음 나온 순서를 따른다', () => {
    const coverage = judge.judge([], [test('A-010'), test('A-002', 'A-010')])

    expect(coverage.unknownIds.map((unknownId) => unknownId.id)).toEqual(['A-010', 'A-002'])
  })

  it('중복 ID는 명세 항목에서 처음 나온 순서를 따른다', () => {
    const coverage = judge.judge([spec('A-010'), spec('A-002'), spec('A-002'), spec('A-010')], [])

    expect(coverage.duplicateIds.map((duplicateId) => duplicateId.id)).toEqual(['A-010', 'A-002'])
  })
})

describe('같은 테스트 항목의 중복 연결', () => {
  it('테스트 항목 1개가 같은 ID를 2번 가리키면 그 명세 항목에 1번만 연결된다', () => {
    const specItem = spec('A-001')
    const testItem = test('A-001', 'A-001')

    const coverage = judge.judge([specItem], [testItem])

    expect(coverage.specs).toEqual([{ specItem, testItems: [testItem] }])
  })

  it('테스트 항목 1개가 같은 알 수 없는 ID를 2번 가리키면 그 ID에 1번만 보고된다', () => {
    const testItem = test('A-999', 'A-999')

    const coverage = judge.judge([], [testItem])

    expect(coverage.unknownIds).toEqual([{ id: 'A-999', testItems: [testItem] }])
  })
})
