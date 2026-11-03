import { describe, expect, it } from 'vitest'
import { TestFile } from './test-file.js'
import type { TestItemCandidate } from './test-item-candidate.js'

const call = (line: number, body: string): TestItemCandidate => ({
  line,
  name: { kind: 'static', value: 't' },
  tagCandidate: { line: line - 1, body },
})
const idsOf = (testFile: TestFile) => testFile.items.map((item) => item.ids.values.map((id) => id.value))

describe('테스트 항목 후보를 테스트 항목과 틀린 태그로 나누기', () => {
  it('태그 후보가 테스트 태그이면 테스트 항목 목록에 담는다', () => {
    const testFile = TestFile.of('a.test.ts', [call(2, ' nocap: A-001')])

    expect([idsOf(testFile), testFile.invalidTags]).toEqual([[['A-001']], []])
  })

  it('태그 후보가 테스트 태그가 아니면 어느 목록에도 담지 않는다', () => {
    const testFile = TestFile.of('a.test.ts', [call(2, ' TODO')])

    expect([testFile.items, testFile.invalidTags]).toEqual([[], []])
  })

  it('태그 후보가 틀린 태그이면 틀린 태그 목록에 담는다', () => {
    const testFile = TestFile.of('a.test.ts', [call(2, ' nocap: A.1')])

    expect([testFile.items, testFile.invalidTags.map((invalidTag) => invalidTag.kind)]).toEqual([[], ['id-rule-violation']])
  })

  it('테스트 항목은 테스트 항목 후보의 순서를 따른다', () => {
    const testFile = TestFile.of('a.test.ts', [call(4, ' nocap: A-002'), call(2, ' nocap: A-001')])

    expect(idsOf(testFile)).toEqual([['A-002'], ['A-001']])
  })
})
