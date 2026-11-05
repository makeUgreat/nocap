import { describe, expect, expectTypeOf, it } from 'vitest'
import { hasTwoOrMore, isNonEmpty, mapNonEmpty } from './array-length.js'

describe('isNonEmpty', () => {
  it('undefined이면 거짓이다', () => {
    expect(isNonEmpty(undefined)).toBe(false)
  })

  it('항목이 0개이면 거짓이다', () => {
    expect(isNonEmpty([])).toBe(false)
  })

  it('항목이 1개이면 참이다', () => {
    expect(isNonEmpty([1])).toBe(true)
  })

  it('참이면 타입을 비어 있지 않은 배열로 좁힌다', () => {
    const items = [1] as readonly number[] | undefined
    if (!isNonEmpty(items)) throw new Error('expected a non-empty array')

    expectTypeOf(items).toEqualTypeOf<[number, ...number[]]>()
  })
})

describe('hasTwoOrMore', () => {
  it('항목이 1개이면 거짓이다', () => {
    expect(hasTwoOrMore([1])).toBe(false)
  })

  it('항목이 2개이면 참이다', () => {
    expect(hasTwoOrMore([1, 2])).toBe(true)
  })

  it('참이면 타입을 항목이 2개 이상인 배열로 좁힌다', () => {
    const items = [1, 2] as readonly [number, ...number[]]
    if (!hasTwoOrMore(items)) throw new Error('expected two or more items')

    expectTypeOf(items).toEqualTypeOf<readonly [number, number, ...number[]]>()
  })
})

describe('mapNonEmpty', () => {
  it('항목이 1개이면 바꾼 항목 1개를 돌려준다', () => {
    expect(mapNonEmpty([1], (n) => n * 10)).toEqual([10])
  })

  it('항목이 여러 개이면 순서를 지켜 모두 바꾼다', () => {
    expect(mapNonEmpty([1, 2, 3], (n) => `${n}`)).toEqual(['1', '2', '3'])
  })

  it('결과 타입은 바꾼 값의 비어 있지 않은 배열이다', () => {
    expectTypeOf(mapNonEmpty([1], (n) => `${n}`)).toEqualTypeOf<[string, ...string[]]>()
  })

  it('빈 배열은 타입 검사에서 받지 않는다', () => {
    const empty: number[] = []
    // @ts-expect-error an array that may be empty is not a non-empty tuple
    expectTypeOf(mapNonEmpty(empty, (n) => n)).toBeArray()
  })
})
