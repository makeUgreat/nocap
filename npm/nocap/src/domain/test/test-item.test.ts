import { describe, expect, it } from 'vitest'
import { CommentsAboveTestUnit } from './comments-above-test-unit.js'
import type { TestComment } from './test-comment.boundary.js'
import { TestItem } from './test-item.js'

const newlinesIn = (body: string) => body.split('\n').length - 1
const line = (at: number, body: string): TestComment => ({ line: at, endLine: at, body, style: 'line', hasCodeOnLine: false })
const block = (at: number, body: string): TestComment => ({
  line: at,
  endLine: at + newlinesIn(body),
  body,
  style: 'block',
  hasCodeOnLine: false,
})
// The comments must fill the lines just above `at` so that they form the run of the test unit at `at`.
const call = (at: number, ...comments: [TestComment, ...TestComment[]]): CommentsAboveTestUnit => {
  const [run] = CommentsAboveTestUnit.collect(comments, [{ line: at }]).found
  if (run === undefined) throw new Error(`the comments in fixture are not just above line ${at}`)
  return run
}
const idsOf = (run: CommentsAboveTestUnit) => TestItem.parse('a.test.ts', run).item?.ids.map((id) => id.value)
const kindsOf = (run: CommentsAboveTestUnit) => TestItem.parse('a.test.ts', run).invalidTags.map((invalidTag) => invalidTag.kind)

describe('테스트 단위 위의 주석 덩어리에서 테스트 항목 만들기', () => {
  it('주석 덩어리의 테스트 태그가 1개이면 테스트 단위의 줄로 테스트 항목을 만든다', () => {
    const { item } = TestItem.parse('a.test.ts', call(2, line(1, ' nocap: A-001')))

    expect([item?.ids.map((id) => id.value), item?.location]).toEqual([['A-001'], { path: 'a.test.ts', line: 2 }])
  })

  it('주석 덩어리의 테스트 태그가 여러 개이면 위에서 아래 순서로 ID를 가진 테스트 항목 1개를 만든다', () => {
    expect(idsOf(call(3, line(1, ' nocap: A-002'), line(2, ' nocap: A-001')))).toEqual(['A-002', 'A-001'])
  })

  it('주석 덩어리 안의 다른 라인 주석과 블록 주석은 건너뛴다', () => {
    expect(idsOf(call(4, line(1, ' nocap: A-001'), block(2, '* 설명 '), line(3, ' @ts-expect-error')))).toEqual(['A-001'])
  })

  it('주석 덩어리에 테스트 태그가 없으면 테스트 항목을 만들지 않는다', () => {
    expect(TestItem.parse('a.test.ts', call(2, line(1, ' TODO')))).toEqual({ item: undefined, invalidTags: [] })
  })
})

describe('틀린 태그', () => {
  it('주석 덩어리의 테스트 태그가 ID 규칙을 어기면 그 태그의 줄에 틀린 태그를 돌려준다', () => {
    expect(TestItem.parse('a.test.ts', call(2, line(1, ' nocap: A.1'))).invalidTags).toEqual([
      {
        kind: 'id-rule-violation',
        location: { path: 'a.test.ts', line: 1 },
        invalidCandidate: { kind: 'invalid-char', value: 'A.1', firstInvalidChar: '.' },
      },
    ])
  })

  it('주석 덩어리에 틀린 테스트 태그가 있어도 나머지 테스트 태그로 테스트 항목을 만든다', () => {
    const site = call(3, line(1, ' nocap: A-001'), line(2, ' nocap: A.2'))

    expect([idsOf(site), kindsOf(site)]).toEqual([['A-001'], ['id-rule-violation']])
  })

  it('주석 덩어리의 테스트 태그가 모두 틀리면 테스트 항목을 만들지 않는다', () => {
    expect(idsOf(call(2, line(1, ' nocap:')))).toBeUndefined()
  })

  it('주석 덩어리에 같은 ID의 테스트 태그가 2개이면 뒤의 태그를 첫 태그의 줄과 함께 돌려준다', () => {
    const site = call(3, line(1, ' nocap: A-001'), line(2, ' nocap: A-001'))

    expect([idsOf(site), TestItem.parse('a.test.ts', site).invalidTags]).toEqual([
      ['A-001'],
      [{ kind: 'repeated-id', location: { path: 'a.test.ts', line: 2 }, id: { value: 'A-001' }, firstTagLine: 1 }],
    ])
  })

  it('주석 덩어리의 블록 주석에 nocap:이 있으면 블록 주석 틀린 태그를 돌려준다', () => {
    expect(kindsOf(call(2, block(1, '* nocap: A-001 ')))).toEqual(['block-comment'])
  })

  it('블록 주석 본문이 그대로 올바른 태그여도 테스트 태그로 받지 않고 블록 주석 틀린 태그를 돌려준다', () => {
    const site = call(2, block(1, ' nocap: A-001 '))

    expect([idsOf(site), kindsOf(site)]).toEqual([undefined, ['block-comment']])
  })

  it('여러 줄 블록 주석의 한 줄이 * 뒤에 nocap:으로 시작하면 블록 주석 틀린 태그를 돌려준다', () => {
    expect(kindsOf(call(5, block(1, '*\n * 설명\n * nocap: A-001\n ')))).toEqual(['block-comment'])
  })

  it('여러 줄 블록 주석의 틀린 태그는 nocap:으로 시작하는 줄을 위치로 쓴다', () => {
    const { invalidTags } = TestItem.parse('a.test.ts', call(5, block(1, '*\n * 설명\n * nocap: A-001\n ')))

    expect(invalidTags.map(({ location }) => location.line)).toEqual([3])
  })

  it('블록 주석에서 nocap:이 줄 중간에만 있으면 틀린 태그를 돌려주지 않는다', () => {
    expect(kindsOf(call(4, block(1, '*\n * 설명 nocap: A-001\n ')))).toEqual([])
  })
})

describe('위치가 틀린 주석', () => {
  it('라인 주석이 nocap:으로 시작하면 ID 규칙을 어겨도 위치 이유를 가진 틀린 태그를 돌려준다', () => {
    expect(TestItem.misplaced('a.test.ts', { kind: 'after-code', comment: line(1, ' nocap: A.1') })).toEqual({
      kind: 'after-code',
      location: { path: 'a.test.ts', line: 1 },
    })
  })

  it('블록 주석에 nocap:이 있으면 위치 이유를 가진 틀린 태그를 돌려준다', () => {
    expect(TestItem.misplaced('a.test.ts', { kind: 'not-above-test-call', comment: block(1, ' nocap: A-001 ') }).kind).toBe(
      'not-above-test-call',
    )
  })

  it('위치가 틀린 여러 줄 블록 주석은 nocap:으로 시작하는 줄을 위치로 쓴다', () => {
    const comment = block(4, '*\n * nocap: A-001\n ')

    expect(TestItem.misplaced('a.test.ts', { kind: 'not-above-test-call', comment })).toEqual({
      kind: 'not-above-test-call',
      location: { path: 'a.test.ts', line: 5 },
    })
  })

  it('주석에 nocap:이 없으면 태그가 아니라고 돌려준다', () => {
    expect(TestItem.misplaced('a.test.ts', { kind: 'not-above-test-call', comment: line(1, ' TODO') })).toEqual({ kind: 'not-tag' })
  })
})
