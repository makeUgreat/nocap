import { describe, expect, it } from 'vitest'
import { IdCandidates } from './id-candidates.js'

const candidatesOf = (body: string) => {
  const result = IdCandidates.parse(body)
  return result.kind === 'candidates' ? result.candidates.values : result.kind
}

describe('태그로 보는 본문', () => {
  it('nocap: 뒤에 ID가 하나이면 그 ID 1개를 반환한다', () => {
    expect(candidatesOf('nocap: A-001')).toEqual(['A-001'])
  })

  it('ID를 쉼표로 이으면 쓴 순서대로 ID를 반환한다', () => {
    expect(candidatesOf('nocap: A-002, A-001')).toEqual(['A-002', 'A-001'])
  })

  it('본문 앞뒤, 콜론 뒤, 쉼표 앞뒤에 공백이 없어도 같은 ID를 반환한다', () => {
    expect(candidatesOf('nocap:A-001,A-002')).toEqual(['A-001', 'A-002'])
  })

  it('본문 앞뒤와 콜론 뒤에 줄바꿈과 탭이 있으면 빼고 ID를 반환한다', () => {
    expect(candidatesOf('\n\tnocap:\tA-001\n')).toEqual(['A-001'])
  })

  it('마지막 ID 뒤에 쉼표가 있으면 그 쉼표를 무시한다', () => {
    expect(candidatesOf('nocap: A-001, A-002,')).toEqual(['A-001', 'A-002'])
  })

  it('같은 ID를 2번 쓰면 2번 모두 반환한다', () => {
    expect(candidatesOf('nocap: A-001, A-001')).toEqual(['A-001', 'A-001'])
  })

  it('쉼표 사이의 값에 공백이 있으면 공백을 포함한 값 하나로 반환한다', () => {
    expect(candidatesOf('nocap: A-001 A-002')).toEqual(['A-001 A-002'])
  })

  it('ID 규칙을 어긴 ID도 그대로 반환한다', () => {
    expect(candidatesOf('nocap: A.1')).toEqual(['A.1'])
  })
})

describe('태그가 아닌 본문', () => {
  it('nocap:으로 시작하지 않으면 태그가 아니다', () => {
    expect(candidatesOf(' TODO ')).toBe('not-tag')
  })

  it('@로 시작하는 옛 표기는 태그가 아니다', () => {
    expect(candidatesOf('@A-001')).toBe('not-tag')
  })

  it('접두어가 대문자이면 태그가 아니다', () => {
    expect(candidatesOf('NOCAP: A-001')).toBe('not-tag')
  })

  it('nocap과 콜론 사이에 공백이 있으면 태그가 아니다', () => {
    expect(candidatesOf('nocap : A-001')).toBe('not-tag')
  })

  it('빈 문자열이면 태그가 아니다', () => {
    expect(candidatesOf('')).toBe('not-tag')
  })
})

describe('ID가 누락된 본문', () => {
  it('nocap: 뒤에 아무것도 없으면 ID 누락이다', () => {
    expect(candidatesOf('nocap:')).toBe('missing-id')
  })

  it('nocap: 뒤에 공백만 있으면 ID 누락이다', () => {
    expect(candidatesOf('nocap:   ')).toBe('missing-id')
  })

  it('nocap: 뒤에 쉼표만 있으면 ID 누락이다', () => {
    expect(candidatesOf('nocap: ,')).toBe('missing-id')
  })

  it('쉼표 사이가 비어 있으면 ID 누락이다', () => {
    expect(candidatesOf('nocap: A-001,,A-002')).toBe('missing-id')
  })

  it('맨 앞 ID 자리가 비어 있으면 ID 누락이다', () => {
    expect(candidatesOf('nocap: ,A-001')).toBe('missing-id')
  })

  it('끝에 쉼표가 2개 있으면 ID 누락이다', () => {
    expect(candidatesOf('nocap: A-001,,')).toBe('missing-id')
  })
})
