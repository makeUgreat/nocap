import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TestFile } from '../../../src/domain/test/test-file.js'
import { TestFileTypescriptParser } from '../../../src/infrastructure/typescript/test-file.typescript.parser.js'

const pathOf = (name: string) => join(import.meta.dirname, 'fixtures', name)
const parseFixture = (name: string) => {
  const result = new TestFileTypescriptParser().parse(pathOf(name), readFileSync(pathOf(name), 'utf8'))
  if (result.kind !== 'parsed') throw new Error(`expected parsed but got ${result.kind}`)
  return result
}
const testFileOf = (name: string) => {
  const { comments, testUnits } = parseFixture(name)
  return TestFile.of(name, comments, testUnits)
}
const ownLine = (at: number, body: string) => ({ line: at, endLine: at, body, style: 'line', hasCodeOnLine: false })

describe('실제 TypeScript 파일의 주석과 테스트 단위', () => {
  it('import, 중첩 describe, each 호출, 태그된 템플릿, 수식자, 여러 줄 호출, 쌓은 태그가 섞인 파일이면 모든 주석과 테스트 단위의 줄을 파일 순서대로 반환한다', () => {
    const { comments, testUnits } = parseFixture('success.ts')

    expect([comments, testUnits.map(({ line }) => line)]).toEqual([
      [
        ownLine(1, ' @ts-nocheck'),
        ownLine(5, ' nocap: A-001'),
        ownLine(7, ' nocap: A-002'),
        ownLine(12, ' nocap: A-003'),
        ownLine(13, ' nocap: A-004'),
        ownLine(18, ' nocap: A-005'),
        ownLine(27, ' TODO 해제 테스트 추가'),
        ownLine(29, ' nocap: B-001'),
      ],
      [6, 8, 14, 19, 28, 30],
    ])
  })

  it('블록 주석, 여러 줄 JSDoc, 코드 뒤 주석이 있는 파일이면 주석마다 형태, 끝 줄, 같은 줄의 코드 여부를 반환한다', () => {
    const facts = parseFixture('failure.ts').comments.map(({ line, endLine, style, hasCodeOnLine }) => [
      line,
      endLine,
      style,
      hasCodeOnLine,
    ])

    expect(facts.filter(([line]) => [8, 11, 16, 19].includes(line as number))).toEqual([
      [8, 8, 'block', false],
      [11, 13, 'block', false],
      [16, 16, 'line', true],
      [19, 19, 'line', true],
    ])
  })

  it('쌓은 태그가 섞인 파일이면 틀린 태그 없이 테스트 항목을 만든다', () => {
    const testFile = testFileOf('success.ts')

    expect([testFile.testItems.map((item) => item.ids.map((id) => id.value)), testFile.invalidTags]).toEqual([
      [['A-001'], ['A-002'], ['A-003', 'A-004'], ['A-005'], ['B-001']],
      [],
    ])
  })

  it('빈 줄, 블록 주석, 코드 뒤 주석, 목록에 없는 호출, 감싼 호출, 호출이 아닌 문장, 문자열 안에만 태그가 있는 파일이면 테스트 항목 없이 문자열 밖의 태그만 위치와 이유로 보고한다', () => {
    const testFile = testFileOf('failure.ts')

    expect([testFile.testItems, testFile.invalidTags.map(({ kind, location }) => [location.line, kind])]).toEqual([
      [],
      [
        [4, 'not-above-test-call'],
        [8, 'block-comment'],
        [12, 'block-comment'],
        [16, 'after-code'],
        [19, 'after-code'],
        [21, 'not-above-test-call'],
        [24, 'not-above-test-call'],
        [27, 'not-above-test-call'],
      ],
    ])
  })

  it('같은 줄의 중첩 호출, JSX, 제네릭 화살표 함수, 빈 주석, 인자 없는 호출, 들여쓴 주석, 줄바꿈 없는 끝이 있는 TSX 파일이면 줄마다 가장 바깥 테스트 호출만 테스트 단위로 반환한다', () => {
    expect(parseFixture('edge.tsx').testUnits.map(({ line }) => line)).toEqual([6, 9, 15, 21, 24])
  })

  it('줄바꿈 없이 끝나는 마지막 줄의 테스트 태그는 테스트 호출 위가 아님을 보고한다', () => {
    expect(testFileOf('edge.tsx').invalidTags.map(({ kind, location }) => [location.line, kind])).toEqual([[25, 'not-above-test-call']])
  })
})
