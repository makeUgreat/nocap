import { describe, expect, it } from 'vitest'
import { TestItem } from './test-item.js'
import type { TagSite } from '../shared/tag-site.js'
import type { TestName } from './test-name.js'

const call = (line: number, body: string): TagSite<TestName> => ({
  line,
  subject: { kind: 'static', value: 't' },
  comment: { line: line - 1, body },
})

describe('테스트 호출의 태그 자리에서 테스트 항목 만들기', () => {
  it('태그 자리의 주석이 테스트 태그이면 테스트 호출의 줄과 테스트 이름으로 테스트 항목을 만든다', () => {
    const result = TestItem.parse('a.test.ts', call(2, ' nocap: A-001'))

    if (result.kind !== 'valid') throw new Error(`expected a test item, got ${result.kind}`)
    expect([result.item.ids.values.map((id) => id.value), result.item.location, result.item.name]).toEqual([
      ['A-001'],
      { path: 'a.test.ts', line: 2 },
      { kind: 'static', value: 't' },
    ])
  })

  it('태그 자리의 주석이 테스트 태그가 아니면 태그가 아니라고 돌려준다', () => {
    expect(TestItem.parse('a.test.ts', call(2, ' TODO'))).toEqual({ kind: 'not-tag' })
  })

  it('테스트 태그에 같은 ID를 2번 쓰면 처음 나온 자리에 1번만 가진 테스트 항목을 만든다', () => {
    const result = TestItem.parse('a.test.ts', call(2, ' nocap: A-001, A-002, A-001'))

    if (result.kind !== 'valid') throw new Error(`expected a test item, got ${result.kind}`)
    expect(result.item.ids.values.map((id) => id.value)).toEqual(['A-001', 'A-002'])
  })
})

describe('틀린 태그', () => {
  it('태그 자리의 주석이 ID 규칙을 어기면 그 태그의 줄에 틀린 태그를 돌려준다', () => {
    expect(TestItem.parse('a.test.ts', call(2, ' nocap: A.1'))).toEqual({
      kind: 'id-rule-violation',
      location: { path: 'a.test.ts', line: 1 },
      invalidCandidates: [{ kind: 'invalid-char', value: 'A.1', firstInvalidChar: '.' }],
    })
  })

  it('태그 자리의 주석에 ID가 누락되면 그 태그의 줄에 ID 누락 틀린 태그를 돌려준다', () => {
    expect(TestItem.parse('a.test.ts', call(2, ' nocap: A-001,,A-002'))).toEqual({
      kind: 'missing-id',
      location: { path: 'a.test.ts', line: 1 },
    })
  })
})
