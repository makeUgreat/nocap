// @ts-nocheck
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

// nocap: E-001
describe('버튼', () => { it('같은 줄의 테스트', () => {}) })

//nocap:E-002
it('JSX를 렌더링한다', () => {
  const view = render(<Button label="확인" />)
  expect(view).toBeTruthy()
})

// nocap: E-003
it('제네릭 화살표 함수를 쓴다', () => {
  const identity = <T,>(value: T) => value
  expect(identity(1)).toBe(1)
})

//
it()

    // nocap: E-004
it('들여쓴 주석 아래의 테스트', () => {})
// nocap: E-005