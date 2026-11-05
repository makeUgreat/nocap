import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SpecDocumentMarkdownParser } from '../../../src/infrastructure/markdown/spec-document.markdown.parser.js'

const parseFixture = (name: string) =>
  new SpecDocumentMarkdownParser().parse(readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8'))
const atItemEnd = (line: number, body: string, itemLine: number, text: string) => ({
  line,
  body,
  placement: { kind: 'first-paragraph-end', itemLine, text },
})
const placed = (kind: string, line: number, body: string) => ({ line, body, placement: { kind } })

describe('실제 Markdown 파일의 주석 배치', () => {
  it('frontmatter, 하위 리스트, 순서 있는 리스트, 인용문이 섞인 파일이면 모든 주석을 첫 문단 끝 배치로 문서 순서대로 반환한다', () => {
    expect(parseFixture('success.md').comments).toEqual([
      atItemEnd(7, ' nocap: A-001 ', 7, '5회 실패하면 계정을 잠금'),
      atItemEnd(9, ' nocap: A-002 ', 8, '잠긴 계정은 관리자가 풀 수 있음'),
      atItemEnd(10, ' nocap: A-003 ', 10, '관리자는 사유를 남겨야 함'),
      atItemEnd(11, ' TODO ', 11, '잠금 사유를 기록함'),
      atItemEnd(15, ' nocap: B-001 ', 15, '30분이 지나면 잠금을 풂'),
      atItemEnd(17, ' nocap: C-001 ', 17, '인용문 안의 항목'),
    ])
  })

  it('헤딩, 문단, 표, 인용문 문단, 둘째 문단, 코드 안에만 주석이 있는 파일이면 코드 밖의 주석만 첫 문단 끝이 아닌 배치로 반환한다', () => {
    expect(parseFixture('failure.md').comments).toEqual([
      placed('outside-item', 1, ' nocap: F-001 '),
      placed('outside-item', 3, ' nocap: F-002 '),
      placed('outside-item', 7, ' nocap: F-003 '),
      placed('outside-item', 9, ' nocap: F-004 '),
      placed('elsewhere-in-item', 11, ' nocap: F-005 '),
      placed('elsewhere-in-item', 16, ' nocap: F-007 '),
    ])
  })

  it('빈 항목, 주석만 있는 항목, 공백 없는 주석, 주석 2개, 빈 주석, 줄바꿈 없는 끝이 있는 파일이면 주석마다 배치를 문서 순서대로 반환한다', () => {
    expect(parseFixture('edge.md').comments).toEqual([
      placed('first-block', 3, ' nocap: E-001 '),
      atItemEnd(5, 'nocap:E-002', 5, '붙여 쓴 주석'),
      placed('elsewhere-in-item', 7, ' 메모 '),
      atItemEnd(7, ' nocap: E-003 ', 7, '주석 2개 <!-- 메모 -->'),
      atItemEnd(9, '', 9, '빈 주석'),
      atItemEnd(11, ' nocap: E-004 ', 11, '줄바꿈 없이 끝나는 마지막 줄'),
    ])
  })
})
