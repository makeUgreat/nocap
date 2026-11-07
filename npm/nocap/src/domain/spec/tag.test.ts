import { describe, expect, it } from 'vitest'
import { Tag } from './tag.js'

const idOf = (body: string) => {
  const result = Tag.parse(body)
  return result.kind === 'valid' ? result.tag.id.value : result.kind
}

describe('태그 문법', () => {
  it('nocap: 뒤에 ID가 1개이면 그 ID를 가진 태그로 본다', () => {
    expect(idOf(' nocap: A-001 ')).toBe('A-001')
  })

  it('본문 앞뒤와 콜론 뒤에 공백이 없어도 같은 태그로 본다', () => {
    expect(idOf('nocap:A-001')).toBe('A-001')
  })

  it('본문 앞뒤와 콜론 뒤에 줄바꿈과 탭이 있어도 같은 태그로 본다', () => {
    expect(idOf('\n\tnocap:\tA-001\n')).toBe('A-001')
  })

  it('nocap:으로 시작하지 않으면 태그가 아니다', () => {
    expect(Tag.parse(' @A-001 ')).toEqual({ kind: 'not-tag' })
  })

  it('접두어가 대문자이면 태그가 아니다', () => {
    expect(Tag.parse(' NOCAP: A-001 ')).toEqual({ kind: 'not-tag' })
  })

  it('nocap과 콜론 사이에 공백이 있으면 태그가 아니다', () => {
    expect(Tag.parse(' nocap : A-001 ')).toEqual({ kind: 'not-tag' })
  })

  it('빈 문자열이면 태그가 아니다', () => {
    expect(Tag.parse('')).toEqual({ kind: 'not-tag' })
  })
})

describe('ID 누락', () => {
  it('nocap: 뒤에 아무것도 없으면 ID 누락으로 본다', () => {
    expect(Tag.parse(' nocap: ')).toEqual({ kind: 'missing-id' })
  })
})

describe('ID 개수 초과', () => {
  it('쉼표로 나눈 값 중 빈 값이 아닌 것이 2개이면 그 값들을 쓴 순서대로 담은 ID 개수 초과로 본다', () => {
    expect(Tag.parse(' nocap: A-002, A-001 ')).toEqual({ kind: 'multiple-ids', values: ['A-002', 'A-001'] })
  })

  it('쉼표 사이가 비어 있어도 빈 값이 아닌 것이 2개이면 ID 개수 초과로 본다', () => {
    expect(Tag.parse(' nocap: A-001,,A-002 ')).toEqual({ kind: 'multiple-ids', values: ['A-001', 'A-002'] })
  })

  it('규칙을 어긴 값이 있어도 빈 값이 아닌 것이 2개이면 ID 개수 초과로 본다', () => {
    expect(Tag.parse(' nocap: A.1, B ').kind).toBe('multiple-ids')
  })
})

describe('ID 규칙 위반', () => {
  it('ID에 규칙 밖의 문자가 있으면 그 문자를 담은 ID 규칙 위반으로 본다', () => {
    expect(Tag.parse(' nocap: A.1 ')).toEqual({
      kind: 'id-rule-violation',
      invalidCandidate: { kind: 'invalid-char', value: 'A.1', firstInvalidChar: '.' },
    })
  })

  it('쉼표 없이 공백으로 나뉜 ID는 공백을 포함한 ID 하나의 규칙 위반으로 본다', () => {
    expect(Tag.parse(' nocap: A-001 A-002 ')).toEqual({
      kind: 'id-rule-violation',
      invalidCandidate: { kind: 'invalid-whitespace', value: 'A-001 A-002' },
    })
  })

  it('ID 뒤에 쉼표가 1개만 있으면 쉼표를 틀린 문자로 담은 ID 규칙 위반으로 본다', () => {
    expect(Tag.parse(' nocap: A-001, ')).toEqual({
      kind: 'id-rule-violation',
      invalidCandidate: { kind: 'invalid-char', value: 'A-001,', firstInvalidChar: ',' },
    })
  })
})
