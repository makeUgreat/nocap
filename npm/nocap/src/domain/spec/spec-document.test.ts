import { describe, expect, it } from 'vitest'
import type { SpecComment } from './spec-comment.boundary.js'
import { SpecDocument } from './spec-document.js'

const atItemEnd = (line: number, body: string): SpecComment => ({
  line,
  body,
  placement: { kind: 'first-paragraph-end', itemLine: line, text: '잠금' },
})
const outsideItem = (line: number, body: string): SpecComment => ({ line, body, placement: { kind: 'outside-item' } })

describe('명세 주석을 명세 항목과 틀린 태그로 나누기', () => {
  it('첫 문단 끝의 주석이 명세 태그이면 명세 항목 목록에 담는다', () => {
    const document = SpecDocument.of('a.md', [atItemEnd(1, 'nocap: A-001')])

    expect([document.specItems.map((item) => item.id.value), document.invalidTags]).toEqual([['A-001'], []])
  })

  it('주석이 명세 태그가 아니면 어느 목록에도 담지 않는다', () => {
    const document = SpecDocument.of('a.md', [atItemEnd(1, ' TODO '), outsideItem(2, ' TODO ')])

    expect([document.specItems, document.invalidTags]).toEqual([[], []])
  })

  it('주석이 틀린 태그이면 틀린 태그 목록에 담는다', () => {
    const document = SpecDocument.of('a.md', [atItemEnd(1, 'nocap: A-001, A-002'), outsideItem(2, ' nocap: A-003 ')])

    expect([document.specItems, document.invalidTags.map((invalidTag) => invalidTag.kind)]).toEqual([
      [],
      ['multiple-ids', 'outside-list-item'],
    ])
  })

  it('명세 항목과 틀린 태그는 주석의 순서를 따른다', () => {
    const document = SpecDocument.of('a.md', [
      atItemEnd(1, 'nocap: A-002'),
      outsideItem(2, ' nocap: B-001 '),
      atItemEnd(3, 'nocap: A-001'),
      atItemEnd(4, 'nocap: A.1'),
    ])

    expect([document.specItems.map((item) => item.id.value), document.invalidTags.map((invalidTag) => invalidTag.location.line)]).toEqual([
      ['A-002', 'A-001'],
      [2, 4],
    ])
  })
})
