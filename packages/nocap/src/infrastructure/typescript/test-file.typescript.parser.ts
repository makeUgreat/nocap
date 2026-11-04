import { extname } from 'node:path'
import { type CallExpression, type Comment, type Expression, parseSync, type Program, type Super, Visitor } from 'oxc-parser'
import type { TestFileParser, TestFileParseResult } from '../../application/test-file.parser.js'
import type { TestItem } from '../../domain/test-item.js'

const SUPPORTED_LANGUAGES = new Map<string, 'ts' | 'tsx' | 'js' | 'jsx'>([
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

type TestCall = { readonly line: number }
type TestTag = { readonly line: number; readonly ids: string[] }
type TestTagMatch = ({ readonly kind: 'test-tag' } & TestTag) | { readonly kind: 'not-test-tag' }

export class TestFileTypescriptParser implements TestFileParser {
  parse(fileName: string, content: string): TestFileParseResult {
    const language = SUPPORTED_LANGUAGES.get(extname(fileName))
    if (language === undefined) return { kind: 'unsupported-extension', extension: extname(fileName) }

    const parsed = parseSync(fileName, content, { lang: language })
    if (parsed.errors.length > 0) return { kind: 'syntax-error', messages: parsed.errors.map((error) => error.message) }

    const testCalls = this.findTestCalls(parsed.program, content)
    const testTags = this.findTestTags(parsed.comments, content)
    const items = this.linkEachTestCallToTagOnLineAbove(testCalls, testTags)
    return { kind: 'parsed', items }
  }

  private findTestCalls(program: Program, content: string): TestCall[] {
    const calls = this.allCalls(program)
    const testCalls = calls.filter((call) => this.isTestCall(call))
    const outermostTestCalls = this.withoutInnerCallsOfChains(testCalls)
    return outermostTestCalls.sort((a, b) => a.start - b.start).map((call) => ({ line: lineNumberAt(content, call.start) }))
  }

  private allCalls(program: Program): CallExpression[] {
    const calls: CallExpression[] = []
    new Visitor({ CallExpression: (call: CallExpression) => calls.push(call) }).visit(program)
    return calls
  }

  private isTestCall(call: CallExpression): boolean {
    const name = rootNameOf(call.callee)
    return name !== undefined && TEST_FUNCTIONS.has(name)
  }

  private withoutInnerCallsOfChains(calls: CallExpression[]): CallExpression[] {
    return calls.filter((call) => !calls.some((other) => other.start === call.start && other.end > call.end))
  }

  private findTestTags(comments: Comment[], content: string): TestTag[] {
    return comments
      .filter((comment) => comment.type === 'Line')
      .filter((comment) => this.isAloneOnItsLine(comment, content))
      .map((comment) => this.testTagIn(comment, content))
      .filter((match) => match.kind === 'test-tag')
  }

  private isAloneOnItsLine(comment: Comment, content: string): boolean {
    const textBeforeOnSameLine = content.slice(0, comment.start).split('\n').at(-1) ?? ''
    return textBeforeOnSameLine.trim() === ''
  }

  private testTagIn(comment: Comment, content: string): TestTagMatch {
    const ids = comment.value.split(',').map((part) => TAGGED_ID.exec(part.trim())?.[1])
    if (!ids.every((id): id is string => id !== undefined)) return { kind: 'not-test-tag' }
    return { kind: 'test-tag', line: lineNumberAt(content, comment.start), ids }
  }

  private linkEachTestCallToTagOnLineAbove(testCalls: TestCall[], testTags: TestTag[]): TestItem[] {
    return testCalls.flatMap((call) => {
      const tagOnLineAbove = testTags.find((tag) => tag.line === call.line - 1)
      return tagOnLineAbove === undefined ? [] : [{ ids: tagOnLineAbove.ids }]
    })
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

function lineNumberAt(content: string, offset: number): number {
  return content.slice(0, offset).split('\n').length - 1
}
