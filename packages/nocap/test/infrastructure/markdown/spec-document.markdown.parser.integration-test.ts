import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SpecDocumentMarkdownParser } from '../../../src/infrastructure/markdown/spec-document.markdown.parser.js'

const parseFixture = (name: string) =>
  new SpecDocumentMarkdownParser().parse(readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8'))

describe('실제 Markdown 파일의 태그 자리', () => {
  it('frontmatter, 하위 리스트, 순서 있는 리스트, 인용문이 섞인 파일이면 리스트 항목마다 태그 자리를 문서 순서대로 반환한다', () => {
    expect(parseFixture('success.md')).toEqual([
      { line: 7, subject: '5회 실패하면 계정을 잠금', comment: { line: 7, body: ' nocap: A-001 ' } },
      { line: 8, subject: '잠긴 계정은 관리자가 풀 수 있음', comment: { line: 9, body: ' nocap: A-002 ' } },
      { line: 10, subject: '관리자는 사유를 남겨야 함', comment: { line: 10, body: ' nocap: A-003 ' } },
      { line: 11, subject: '잠금 사유를 기록함', comment: { line: 11, body: ' TODO ' } },
      { line: 15, subject: '30분이 지나면 잠금을 풂', comment: { line: 15, body: ' nocap: B-001 ' } },
      { line: 17, subject: '인용문 안의 항목', comment: { line: 17, body: ' nocap: C-001 ' } },
    ])
  })

  it('헤딩, 문단, 표, 인용문 문단, 둘째 문단, 코드 안에만 주석이 있는 파일이면 빈 목록을 반환한다', () => {
    expect(parseFixture('failure.md')).toEqual([])
  })

  it('빈 항목, 주석만 있는 항목, 공백 없는 주석, 주석 2개, 빈 주석, 줄바꿈 없는 끝이 있는 파일이면 첫 문단 끝 주석이 있는 항목만 태그 자리로 반환한다', () => {
    expect(parseFixture('edge.md')).toEqual([
      { line: 5, subject: '붙여 쓴 주석', comment: { line: 5, body: 'nocap:E-002' } },
      { line: 7, subject: '주석 2개 <!-- 메모 -->', comment: { line: 7, body: ' nocap: E-003 ' } },
      { line: 9, subject: '빈 주석', comment: { line: 9, body: '' } },
      { line: 11, subject: '줄바꿈 없이 끝나는 마지막 줄', comment: { line: 11, body: ' nocap: E-004 ' } },
    ])
  })
})
