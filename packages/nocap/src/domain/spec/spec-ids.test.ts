import { describe, expect, it } from 'vitest'
import { SpecId } from './spec-id.js'
import { SpecIds } from './spec-ids.js'

const specId = (value: string): SpecId => {
  const result = SpecId.parse(value)
  if (result.kind !== 'valid') throw new Error(`invalid id in fixture: ${value}`)
  return result.id
}
const valuesOf = (ids: SpecIds) => ids.values.map((id) => id.value)

describe('중복 없는 ID 목록', () => {
  it('같은 값의 ID가 여러 번 있으면 처음 나온 순서대로 한 번씩만 남긴다', () => {
    expect(valuesOf(SpecIds.of([specId('A-001'), specId('A-002'), specId('A-001')]))).toEqual(['A-001', 'A-002'])
  })

  it('같은 값의 ID가 없으면 받은 순서 그대로 남긴다', () => {
    expect(valuesOf(SpecIds.of([specId('B-001'), specId('A-001')]))).toEqual(['B-001', 'A-001'])
  })

  it('대소문자만 다른 ID는 다른 ID로 남긴다', () => {
    expect(valuesOf(SpecIds.of([specId('a-001'), specId('A-001')]))).toEqual(['a-001', 'A-001'])
  })
})
