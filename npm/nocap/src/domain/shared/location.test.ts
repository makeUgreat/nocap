import { describe, expect, it } from 'vitest'
import { Location } from './location.js'

describe('위치 규칙', () => {
  it('경로가 있고 줄이 1이면 위치를 만든다', () => {
    expect(Location.of('a.md', 1)).toEqual({ path: 'a.md', line: 1 })
  })

  it('줄이 0이면 오류를 던진다', () => {
    expect(() => Location.of('a.md', 0)).toThrow('Location line must be an integer of 1 or more, got 0')
  })

  it('줄이 정수가 아니면 오류를 던진다', () => {
    expect(() => Location.of('a.md', 1.5)).toThrow('Location line must be an integer of 1 or more, got 1.5')
  })

  it('경로가 빈 문자열이면 오류를 던진다', () => {
    expect(() => Location.of('', 1)).toThrow('Location path must not be empty')
  })
})
