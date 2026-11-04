import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TestFileTypescriptParser } from '../../../src/infrastructure/typescript/test-file.typescript.parser.js'

const parseFixture = (name: string) => {
  const path = join(import.meta.dirname, 'fixtures', name)
  return new TestFileTypescriptParser().parse(path, readFileSync(path, 'utf8'))
}

describe('실제 TypeScript 파일의 태그 자리', () => {
  it('import, 중첩 describe, each 호출, 태그된 템플릿, 수식자, 여러 줄 호출이 섞인 파일이면 테스트 호출마다 태그 자리를 파일 순서대로 반환한다', () => {
    expect(parseFixture('success.ts')).toEqual({
      kind: 'parsed',
      sites: [
        { line: 6, comment: { line: 5, body: ' nocap: A-001' } },
        { line: 8, comment: { line: 7, body: ' nocap: A-002' } },
        { line: 13, comment: { line: 12, body: ' nocap: A-003, A-004' } },
        { line: 18, comment: { line: 17, body: ' nocap: A-005' } },
        { line: 27, comment: { line: 26, body: ' TODO 해제 테스트 추가' } },
        { line: 29, comment: { line: 28, body: ' nocap: B-001' } },
      ],
    })
  })

  it('빈 줄, 블록 주석, 코드 뒤 주석, 목록에 없는 호출, 감싼 호출, 호출이 아닌 문장, 문자열 안에만 태그가 있는 파일이면 빈 목록을 반환한다', () => {
    expect(parseFixture('failure.ts')).toEqual({ kind: 'parsed', sites: [] })
  })

  it('같은 줄의 중첩 호출, JSX, 제네릭 화살표 함수, 빈 주석, 인자 없는 호출, 들여쓴 주석, 줄바꿈 없는 끝이 있는 TSX 파일이면 줄 맨 앞 주석 바로 아래의 가장 바깥 테스트 호출만 태그 자리로 반환한다', () => {
    expect(parseFixture('edge.tsx')).toEqual({
      kind: 'parsed',
      sites: [
        { line: 6, comment: { line: 5, body: ' nocap: E-001' } },
        { line: 9, comment: { line: 8, body: 'nocap:E-002' } },
        { line: 15, comment: { line: 14, body: ' nocap: E-003' } },
        { line: 21, comment: { line: 20, body: '' } },
        { line: 24, comment: { line: 23, body: ' nocap: E-004' } },
      ],
    })
  })
})
