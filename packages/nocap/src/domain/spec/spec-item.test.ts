import { describe, expect, it } from 'vitest'
import { SpecItem, type SpecTagSite } from './spec-item.js'

const listItem = (line: number, body: string, tagLine = line): SpecTagSite => ({
  line,
  text: '잠금',
  comment: { line: tagLine, body },
})

describe('리스트 항목의 태그 자리에서 명세 항목 만들기', () => {
  it('태그 자리의 주석이 명세 태그이면 리스트 항목의 줄과 명세 문장으로 명세 항목을 만든다', () => {
    const result = SpecItem.parse('a.md', listItem(1, 'nocap: A-001', 2))

    if (result.kind !== 'valid') throw new Error(`expected a spec item, got ${result.kind}`)
    expect([result.item.id.value, result.item.location, result.item.text]).toEqual(['A-001', { path: 'a.md', line: 1 }, '잠금'])
  })

  it('태그 자리의 주석이 명세 태그가 아니면 태그가 아니라고 돌려준다', () => {
    expect(SpecItem.parse('a.md', listItem(1, ' TODO '))).toEqual({ kind: 'not-tag' })
  })
})

describe('틀린 태그', () => {
  it('명세 태그가 ID 규칙을 어기면 주석의 줄에 틀린 태그를 돌려준다', () => {
    expect(SpecItem.parse('a.md', listItem(1, 'nocap: A.1', 2))).toEqual({
      kind: 'id-rule-violation',
      location: { path: 'a.md', line: 2 },
      invalidCandidates: [{ kind: 'invalid-char', value: 'A.1', firstInvalidChar: '.' }],
    })
  })

  it('명세 태그에 ID가 누락되면 주석의 줄에 ID 누락 틀린 태그를 돌려준다', () => {
    expect(SpecItem.parse('a.md', listItem(1, 'nocap:', 2))).toEqual({ kind: 'missing-id', location: { path: 'a.md', line: 2 } })
  })

  it('명세 태그에 ID가 2개 있으면 주석의 줄에 그 ID들을 가진 ID 개수 초과 틀린 태그를 돌려준다', () => {
    expect(SpecItem.parse('a.md', listItem(1, 'nocap: A-001, A-002', 2))).toEqual({
      kind: 'multiple-ids',
      location: { path: 'a.md', line: 2 },
      ids: [{ value: 'A-001' }, { value: 'A-002' }],
    })
  })

  it('명세 태그에 같은 ID를 2번 쓰면 2개를 모두 가진 ID 개수 초과 틀린 태그를 돌려준다', () => {
    expect(SpecItem.parse('a.md', listItem(1, 'nocap: A-001, A-001'))).toEqual({
      kind: 'multiple-ids',
      location: { path: 'a.md', line: 1 },
      ids: [{ value: 'A-001' }, { value: 'A-001' }],
    })
  })

  it('명세 태그가 ID 규칙 위반과 ID 개수 초과를 함께 어기면 ID 규칙 위반 틀린 태그를 돌려준다', () => {
    expect(SpecItem.parse('a.md', listItem(1, 'nocap: A.1, A-002')).kind).toBe('id-rule-violation')
  })
})
