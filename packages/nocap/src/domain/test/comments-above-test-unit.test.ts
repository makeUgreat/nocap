import { describe, expect, it } from 'vitest'
import { CommentsAboveTestUnit } from './comments-above-test-unit.js'
import type { TestComment } from './test-comment.boundary.js'
import type { TestUnit } from './test-unit.boundary.js'

const comment = (line: number, endLine = line, hasCodeOnLine = false): TestComment => ({
  line,
  endLine,
  body: ` 주석 ${line}`,
  style: 'line',
  hasCodeOnLine,
})
const collect = (comments: TestComment[], unitLines: number[]) =>
  CommentsAboveTestUnit.collect(
    comments,
    unitLines.map((line): TestUnit => ({ line })),
  )
const runsOf = (comments: TestComment[], unitLines: number[]) =>
  collect(comments, unitLines).found.map((run) => [run.unitLine, run.comments.map(({ line }) => line)])
const misplacedOf = (comments: TestComment[], unitLines: number[]) =>
  collect(comments, unitLines).misplaced.map(({ kind, comment: { line } }) => [kind, line])

describe('줄 탐색으로 주석 덩어리 모으기', () => {
  it('테스트 단위 바로 위부터 위로 이어진 주석을 위에서 아래 순서로 모은다', () => {
    expect(runsOf([comment(1), comment(2)], [3])).toEqual([[3, [1, 2]]])
  })

  it('여러 줄 주석은 첫 줄의 바로 윗줄로 올라가 탐색을 이어 간다', () => {
    expect(runsOf([comment(1), comment(2, 4)], [5])).toEqual([[5, [1, 2]]])
  })

  it('주석이 없는 줄에서 탐색을 멈춘다', () => {
    expect(runsOf([comment(1), comment(3)], [4])).toEqual([[4, [3]]])
  })

  it('코드가 있는 줄의 주석에서 탐색을 멈춘다', () => {
    expect(runsOf([comment(1), comment(2, 2, true)], [3])).toEqual([])
  })

  it('바로 위에 주석이 없는 테스트 단위는 주석 덩어리를 만들지 않는다', () => {
    expect(runsOf([comment(1)], [3])).toEqual([])
  })

  it('같은 줄의 테스트 단위가 여러 번 들어와도 주석 덩어리는 1개만 만든다', () => {
    expect(runsOf([comment(1)], [2, 2])).toEqual([[2, [1]]])
  })

  it('주석 덩어리는 테스트 단위의 줄 순서를 따른다', () => {
    expect(runsOf([comment(1), comment(3)], [4, 2])).toEqual([
      [2, [1]],
      [4, [3]],
    ])
  })
})

describe('주석 덩어리에 들지 않은 주석', () => {
  it('코드가 있는 줄의 주석은 코드 뒤의 주석이다', () => {
    expect(misplacedOf([comment(1, 1, true)], [2])).toEqual([['after-code', 1]])
  })

  it('혼자 줄을 차지하지만 아래에 테스트 단위가 없는 주석은 테스트 단위 위가 아닌 주석이다', () => {
    expect(misplacedOf([comment(1), comment(3)], [4])).toEqual([['not-above-test-call', 1]])
  })

  it('주석 덩어리에 든 주석은 들지 않은 주석에 포함하지 않는다', () => {
    expect(misplacedOf([comment(1)], [2])).toEqual([])
  })
})
