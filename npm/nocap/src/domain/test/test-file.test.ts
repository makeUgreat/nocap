import { describe, expect, it } from 'vitest'
import type { TestComment } from './test-comment.boundary.js'
import { TestFile } from './test-file.js'

const line = (at: number, body: string, hasCodeOnLine = false): TestComment => ({
  line: at,
  endLine: at,
  body,
  style: 'line',
  hasCodeOnLine,
})
const idsOf = (testFile: TestFile) => testFile.testItems.map((item) => item.ids.map((id) => id.value))
const kindsOf = (testFile: TestFile) => testFile.invalidTags.map((invalidTag) => invalidTag.kind)

describe('주석과 테스트 단위를 테스트 항목과 틀린 태그로 나누기', () => {
  it('테스트 단위 위의 주석이 테스트 태그이면 테스트 항목 목록에 담는다', () => {
    const testFile = TestFile.of('a.test.ts', [line(1, ' nocap: A-001')], [{ line: 2 }])

    expect([idsOf(testFile), testFile.invalidTags]).toEqual([[['A-001']], []])
  })

  it('테스트 단위 위의 주석이 테스트 태그가 아니면 어느 목록에도 담지 않는다', () => {
    const testFile = TestFile.of('a.test.ts', [line(1, ' TODO')], [{ line: 2 }])

    expect([testFile.testItems, testFile.invalidTags]).toEqual([[], []])
  })

  it('테스트 단위 위의 주석이 틀린 태그이면 틀린 태그 목록에 담는다', () => {
    const testFile = TestFile.of('a.test.ts', [line(1, ' nocap: A.1')], [{ line: 2 }])

    expect([testFile.testItems, kindsOf(testFile)]).toEqual([[], ['id-rule-violation']])
  })

  it('테스트 항목은 테스트 단위의 줄 순서를 따른다', () => {
    const testFile = TestFile.of('a.test.ts', [line(1, ' nocap: A-002'), line(3, ' nocap: A-001')], [{ line: 4 }, { line: 2 }])

    expect(idsOf(testFile)).toEqual([['A-002'], ['A-001']])
  })
})

describe('주석 덩어리에 들지 않은 주석', () => {
  it('코드가 있는 줄의 nocap: 주석은 코드 뒤의 주석으로 담는다', () => {
    expect(kindsOf(TestFile.of('a.test.ts', [line(1, ' nocap: A-001', true)], [{ line: 2 }]))).toEqual(['after-code'])
  })

  it('아래에 테스트 단위가 없는 nocap: 주석은 테스트 단위 위가 아닌 주석으로 담는다', () => {
    expect(kindsOf(TestFile.of('a.test.ts', [line(1, ' nocap: A-001')], []))).toEqual(['not-above-test-call'])
  })

  it('틀린 태그는 주석 덩어리 안과 밖을 합쳐 줄 순서를 따른다', () => {
    const testFile = TestFile.of('a.test.ts', [line(1, ' nocap: A-001', true), line(3, ' nocap: A.1')], [{ line: 4 }])

    expect(testFile.invalidTags.map((invalidTag) => invalidTag.location.line)).toEqual([1, 3])
  })
})
