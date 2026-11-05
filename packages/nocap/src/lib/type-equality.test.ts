import { describe, expectTypeOf, it } from 'vitest'
import type { Equals } from './type-equality.js'

type Point = { readonly x: number; readonly y: number }

describe('Equals', () => {
  it('필드와 수식어가 모두 같으면 참이다', () => {
    expectTypeOf<Equals<Point, { readonly x: number; readonly y: number }>>().toEqualTypeOf<true>()
  })

  it('한쪽에만 선택 필드가 있으면 거짓이다', () => {
    expectTypeOf<Equals<Point & { readonly z?: number }, Point>>().toEqualTypeOf<false>()
  })

  it('readonly 수식어만 다르면 거짓이다', () => {
    expectTypeOf<Equals<{ x: number; y: number }, Point>>().toEqualTypeOf<false>()
  })
})
