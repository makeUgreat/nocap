import { describe, expect, it } from 'vitest'
import type { SpecComment, SpecCommentPlacement } from './spec-comment.boundary.js'
import { SpecItem } from './spec-item.js'

const atItemEnd = (itemLine: number, body: string, line = itemLine): SpecComment => ({
  line,
  body,
  placement: { kind: 'first-paragraph-end', itemLine, text: '잠금' },
})
const placed = (placement: SpecCommentPlacement, body: string, line = 1): SpecComment => ({ line, body, placement })

describe('첫 문단 끝의 주석에서 명세 항목 만들기', () => {
  it('첫 문단 끝의 주석이 명세 태그이면 리스트 항목의 줄과 명세 문장으로 명세 항목을 만든다', () => {
    const result = SpecItem.parse('a.md', atItemEnd(1, 'nocap: A-001', 2))

    if (result.kind !== 'valid') throw new Error(`expected a spec item, got ${result.kind}`)
    expect([result.item.id.value, result.item.location, result.item.text]).toEqual(['A-001', { path: 'a.md', line: 1 }, '잠금'])
  })

  it('첫 문단 끝의 주석이 명세 태그가 아니면 태그가 아니라고 돌려준다', () => {
    expect(SpecItem.parse('a.md', atItemEnd(1, ' TODO '))).toEqual({ kind: 'not-tag' })
  })
})

describe('틀린 태그', () => {
  it('명세 태그가 ID 규칙을 어기면 주석의 줄에 틀린 태그를 돌려준다', () => {
    expect(SpecItem.parse('a.md', atItemEnd(1, 'nocap: A.1', 2))).toEqual({
      kind: 'id-rule-violation',
      location: { path: 'a.md', line: 2 },
      invalidCandidate: { kind: 'invalid-char', value: 'A.1', firstInvalidChar: '.' },
    })
  })

  it('명세 태그에 ID가 누락되면 주석의 줄에 ID 누락 틀린 태그를 돌려준다', () => {
    expect(SpecItem.parse('a.md', atItemEnd(1, 'nocap:', 2))).toEqual({ kind: 'missing-id', location: { path: 'a.md', line: 2 } })
  })

  it('명세 태그에 ID가 2개 있으면 주석의 줄에 그 값들을 가진 ID 개수 초과 틀린 태그를 돌려준다', () => {
    expect(SpecItem.parse('a.md', atItemEnd(1, 'nocap: A-001, A-002', 2))).toEqual({
      kind: 'multiple-ids',
      location: { path: 'a.md', line: 2 },
      values: ['A-001', 'A-002'],
    })
  })
})

describe('첫 문단 끝이 아닌 주석', () => {
  it('배치마다 그 배치가 어긴 위치 이유를 가진 틀린 태그를 주석의 줄에 돌려준다', () => {
    const placements: SpecCommentPlacement[] = [{ kind: 'first-block' }, { kind: 'elsewhere-in-item' }, { kind: 'outside-item' }]

    expect(placements.map((placement) => SpecItem.parse('a.md', placed(placement, ' nocap: A-001 ', 3)))).toEqual([
      { kind: 'no-sentence', location: { path: 'a.md', line: 3 } },
      { kind: 'not-at-item-end', location: { path: 'a.md', line: 3 } },
      { kind: 'outside-list-item', location: { path: 'a.md', line: 3 } },
    ])
  })

  it('주석이 nocap:으로 시작하면 ID 규칙을 어겨도 위치 이유를 돌려준다', () => {
    expect(SpecItem.parse('a.md', placed({ kind: 'elsewhere-in-item' }, ' nocap: A.1 ')).kind).toBe('not-at-item-end')
  })

  it('주석이 nocap:으로 시작하지 않으면 태그가 아니라고 돌려준다', () => {
    expect(SpecItem.parse('a.md', placed({ kind: 'outside-item' }, ' TODO '))).toEqual({ kind: 'not-tag' })
  })
})
