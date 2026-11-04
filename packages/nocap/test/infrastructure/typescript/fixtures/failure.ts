// @ts-nocheck
import { describe, expect, it } from 'vitest'

// nocap: F-001

it('빈 줄 아래의 테스트', () => {})

/* nocap: F-002 */
it('블록 주석 아래의 테스트', () => {})

/**
 * nocap: F-003
 */
it('JSDoc 아래의 테스트', () => {})

setup() // nocap: F-004
it('코드 뒤 주석 아래의 테스트', () => {})

it('같은 줄 끝의 주석', () => {}) // nocap: F-005

// nocap: F-006
context('목록에 없는 이름', () => {})

// nocap: F-007
wrap(it('감싼 테스트', () => {}))

// nocap: F-008
const cases = [1, 2]

const source = `
// nocap: F-009
it('템플릿 안의 테스트', () => {})
`

describe('문자열 안의 태그', () => {
  const tag = '// nocap: F-010'
  it('문자열 다음 줄의 테스트', () => {
    expect([tag, source, cases]).toBeTruthy()
  })
})
