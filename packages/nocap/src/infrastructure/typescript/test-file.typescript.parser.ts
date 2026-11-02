import { extname } from 'node:path'
import { type CallExpression, type Comment, type Expression, parseSync, type Program, type Super, Visitor } from 'oxc-parser'
import type { TestFileParser, TestFileParseResult } from '../../application/test-file.parser.js'
import type { TestItem } from '../../domain/test-item.js'

const LANGUAGES = new Map<string, 'ts' | 'tsx' | 'js' | 'jsx'>([
  ['.ts', 'ts'],
  ['.mts', 'ts'],
  ['.cts', 'ts'],
  ['.tsx', 'tsx'],
  ['.js', 'js'],
  ['.mjs', 'js'],
  ['.cjs', 'js'],
  ['.jsx', 'jsx'],
])
const TEST_FUNCTIONS = new Set(['it', 'test', 'describe', 'suite'])
const TAGGED_ID = /^@(\S+)$/
type TestTagMatch = { readonly kind: 'test-tag'; readonly ids: string[] } | { readonly kind: 'not-test-tag' }

export class TestFileTypescriptParser implements TestFileParser {
  parse(fileName: string, content: string): TestFileParseResult {
    const extension = extname(fileName)
    const lang = LANGUAGES.get(extension)
    if (lang === undefined) return { kind: 'unsupported-extension', extension }

    const result = parseSync(fileName, content, { lang })
    if (result.errors.length > 0) return { kind: 'syntax-error', messages: result.errors.map((error) => error.message) }

    const lineStarts = lineStartsOf(content)
    const tagsByLine = this.testTagsByLine(result.comments, content, lineStarts)
    const items = this.testCallStarts(result.program)
      .map((start) => tagsByLine.get(lineOf(lineStarts, start) - 1) ?? { kind: 'not-test-tag' as const })
      .filter((tag) => tag.kind === 'test-tag')
      .map((tag): TestItem => ({ ids: tag.ids }))
    return { kind: 'parsed', items }
  }

  /**
   * `test.each([...])('이름', fn)`처럼 호출이 이어지면 바깥 호출과 안쪽 호출의 시작 위치가 같다.
   * 시작 위치마다 하나로 세어 테스트 호출 하나가 테스트 항목 둘이 되지 않게 한다.
   */
  private testCallStarts(program: Program): number[] {
    const starts = new Set<number>()
    new Visitor({
      CallExpression: (call: CallExpression) => {
        if (this.isTestCall(call)) starts.add(call.start)
      },
    }).visit(program)
    return [...starts].sort((a, b) => a - b)
  }

  private isTestCall(call: CallExpression): boolean {
    const name = rootNameOf(call.callee)
    return name !== undefined && TEST_FUNCTIONS.has(name)
  }

  /** 줄 번호마다, 그 줄에 홀로 있는 라인 주석을 테스트 태그로 읽은 결과를 둔다. */
  private testTagsByLine(comments: Comment[], content: string, lineStarts: number[]): Map<number, TestTagMatch> {
    const tags = new Map<number, TestTagMatch>()
    for (const comment of comments) {
      if (comment.type !== 'Line') continue
      const line = lineOf(lineStarts, comment.start)
      const isAloneOnLine = content.slice(lineStarts[line] ?? 0, comment.start).trim() === ''
      if (isAloneOnLine) tags.set(line, this.testTagIn(comment.value))
    }
    return tags
  }

  private testTagIn(comment: string): TestTagMatch {
    const ids: string[] = []
    for (const part of comment.split(',')) {
      const id = TAGGED_ID.exec(part.trim())?.[1]
      if (id === undefined) return { kind: 'not-test-tag' }
      ids.push(id)
    }
    return { kind: 'test-tag', ids }
  }
}

function rootNameOf(node: Expression | Super): string | undefined {
  switch (node.type) {
    case 'Identifier':
      return node.name
    case 'MemberExpression':
      return rootNameOf(node.object)
    case 'CallExpression':
      return rootNameOf(node.callee)
    case 'TaggedTemplateExpression':
      return rootNameOf(node.tag)
    default:
      return undefined
  }
}

function lineStartsOf(content: string): number[] {
  const starts = [0]
  for (let i = content.indexOf('\n'); i !== -1; i = content.indexOf('\n', i + 1)) starts.push(i + 1)
  return starts
}

function lineOf(lineStarts: number[], offset: number): number {
  let low = 0
  let high = lineStarts.length - 1
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if ((lineStarts[mid] ?? 0) <= offset) low = mid
    else high = mid - 1
  }
  return low
}
