import { describe, expect, it } from 'vitest'
import { SpecId } from './spec-id.js'

describe('ID 문자 규칙', () => {
  it('영문 대소문자, 숫자, -, _로만 된 문자열이면 ID를 만든다', () => {
    const result = SpecId.parse('Auth_01-x')

    expect(result.kind === 'valid' && result.id.value).toBe('Auth_01-x')
  })

  it('빈 문자열이면 예외를 던진다', () => {
    expect(() => SpecId.parse('')).toThrow()
  })

  it('규칙 밖의 문자가 하나라도 있으면 ID를 만들지 않는다', () => {
    expect(['A.1', '인증-001', 'A 1'].map((value) => SpecId.parse(value).kind)).not.toContain('valid')
  })
})

describe('ID를 만들지 않은 이유', () => {
  it('규칙 밖의 문자가 여러 개이면 처음 나온 문자를 이유로 돌려준다', () => {
    expect(SpecId.parse('A.1 2')).toEqual({ kind: 'invalid-char', value: 'A.1 2', firstInvalidChar: '.' })
  })

  it('한글 1글자를 문자 1개로 돌려준다', () => {
    expect(SpecId.parse('A인증')).toEqual({ kind: 'invalid-char', value: 'A인증', firstInvalidChar: '인' })
  })

  it('이모지 1개를 반으로 자르지 않고 문자 1개로 돌려준다', () => {
    expect(SpecId.parse('A😀')).toEqual({ kind: 'invalid-char', value: 'A😀', firstInvalidChar: '😀' })
  })

  it('처음 나온 규칙 밖의 문자가 공백이면 공백을 이유로 돌려준다', () => {
    expect(SpecId.parse('A-001 A-002')).toEqual({ kind: 'invalid-whitespace', value: 'A-001 A-002' })
  })
})
