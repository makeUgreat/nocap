import { describe, expect, it } from 'vitest'
import { Tag } from './tag.js'

const idsOf = (body: string) => {
  const result = Tag.parse(body)
  return result.kind === 'valid' ? result.tag.ids.map((id) => id.value) : result.kind
}

describe('태그 문법', () => {
  it('nocap: 뒤에 ID를 쉼표로 이으면 쓴 순서대로 ID를 가진 태그로 본다', () => {
    expect(idsOf(' nocap: A-002, A-001 ')).toEqual(['A-002', 'A-001'])
  })

  it('마지막 ID 뒤에 쉼표가 있어도 같은 태그로 본다', () => {
    expect(idsOf(' nocap: A-001, ')).toEqual(['A-001'])
  })

  it('같은 ID를 2번 쓰면 2개를 모두 가진 태그로 본다', () => {
    expect(idsOf(' nocap: A-001, A-001 ')).toEqual(['A-001', 'A-001'])
  })

  it('nocap:으로 시작하지 않으면 태그가 아니다', () => {
    expect(Tag.parse(' @A-001 ')).toEqual({ kind: 'not-tag' })
  })

  it('빈 문자열이면 태그가 아니다', () => {
    expect(Tag.parse('')).toEqual({ kind: 'not-tag' })
  })
})

describe('틀린 태그', () => {
  it('ID가 누락되면 ID 누락으로 본다', () => {
    expect(Tag.parse(' nocap: A-001,,A-002 ')).toEqual({ kind: 'missing-id' })
  })

  it('ID 누락과 ID 규칙 위반을 함께 어기면 ID 누락으로 본다', () => {
    expect(Tag.parse(' nocap: A.1,, ')).toEqual({ kind: 'missing-id' })
  })

  it('ID 하나라도 규칙을 어기면 규칙을 어긴 ID만 쓴 순서대로 담은 ID 규칙 위반으로 본다', () => {
    expect(Tag.parse(' nocap: A-001, A.1, B/2 ')).toEqual({
      kind: 'id-rule-violation',
      invalidCandidates: [
        { kind: 'invalid-char', value: 'A.1', firstInvalidChar: '.' },
        { kind: 'invalid-char', value: 'B/2', firstInvalidChar: '/' },
      ],
    })
  })

  it('규칙을 어긴 같은 ID를 2번 쓰면 그 ID를 1번만 담은 ID 규칙 위반으로 본다', () => {
    expect(Tag.parse(' nocap: A.1, A.1 ')).toEqual({
      kind: 'id-rule-violation',
      invalidCandidates: [{ kind: 'invalid-char', value: 'A.1', firstInvalidChar: '.' }],
    })
  })

  it('쉼표 없이 공백으로 나뉜 ID는 공백을 포함한 ID 하나의 규칙 위반으로 본다', () => {
    expect(Tag.parse(' nocap: A-001 A-002 ')).toEqual({
      kind: 'id-rule-violation',
      invalidCandidates: [{ kind: 'invalid-whitespace', value: 'A-001 A-002' }],
    })
  })
})
