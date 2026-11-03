import { describe, expect, it } from 'vitest'
import { SpecDocument } from './spec-document.js'
import type { SpecTagSite } from './spec-tag-site.boundary.js'

const listItem = (line: number, body: string): SpecTagSite => ({
  line,
  text: '잠금',
  comment: { line, body },
})

describe('리스트 항목의 태그 자리를 명세 항목과 틀린 태그로 나누기', () => {
  it('태그 자리의 주석이 명세 태그이면 명세 항목 목록에 담는다', () => {
    const document = SpecDocument.of('a.md', [listItem(1, 'nocap: A-001')])

    expect([document.specItems.map((item) => item.id.value), document.invalidTags]).toEqual([['A-001'], []])
  })

  it('태그 자리의 주석이 명세 태그가 아니면 어느 목록에도 담지 않는다', () => {
    const document = SpecDocument.of('a.md', [listItem(1, ' TODO ')])

    expect([document.specItems, document.invalidTags]).toEqual([[], []])
  })

  it('태그 자리의 주석이 틀린 태그이면 틀린 태그 목록에 담는다', () => {
    const document = SpecDocument.of('a.md', [listItem(1, 'nocap: A-001, A-002')])

    expect([document.specItems, document.invalidTags.map((invalidTag) => invalidTag.kind)]).toEqual([[], ['multiple-ids']])
  })

  it('명세 항목은 태그 자리의 순서를 따른다', () => {
    const document = SpecDocument.of('a.md', [listItem(1, 'nocap: A-002'), listItem(2, 'nocap: A-001')])

    expect(document.specItems.map((item) => item.id.value)).toEqual(['A-002', 'A-001'])
  })
})
