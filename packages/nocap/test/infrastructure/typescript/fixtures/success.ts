import { describe, expect, it, test } from 'vitest'
import { lock, unlockAfter } from '../src/lock.js'

// nocap: A-001
describe('계정 잠금', () => {
  // nocap: A-002
  it('5회 실패하면 잠근다', () => {
    expect(lock(5)).toBe(true)
  })

  // nocap: A-003, A-004
  it.each([1, 2])('%i회 실패하면 잠그지 않는다', (count) => {
    expect(lock(count)).toBe(false)
  })

  // nocap: A-005
  test.each`
    count | locked
    ${5}  | ${true}
  `('$count회 실패하면 $locked', ({ count, locked }) => {
    expect(lock(count)).toBe(locked)
  })
})

// TODO 해제 테스트 추가
describe.concurrent.only('잠금 해제', () => {
  // nocap: B-001
  it(
    '30분이 지나면 푼다',
    async () => {
      await expect(unlockAfter(30)).resolves.toBe(true)
    },
  )
})
