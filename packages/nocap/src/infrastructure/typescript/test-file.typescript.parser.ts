import { extname } from 'node:path'
import { type CallExpression, type Comment, type Expression, parseSync, type Program, type Super, Visitor } from 'oxc-parser'
import type { TestFileParser, TestFileParseResult } from '../../application/test/test-file.parser.js'
import type { TestComment } from '../../domain/test/test-comment.boundary.js'
import type { TestUnit } from '../../domain/test/test-unit.boundary.js'
import { isNonEmpty, mapNonEmpty } from '../../lib/array-length.js'
import { LineIndex } from '../../lib/line-index.js'

type Language = 'ts' | 'tsx' | 'js' | 'jsx'
const LANGUAGE_ENTRIES: readonly [readonly [string, Language], ...(readonly [string, Language])[]] = [
  ['.ts', 'ts'],
  ['.mts', 'ts'],
  ['.cts', 'ts'],
  ['.tsx', 'tsx'],
  ['.js', 'js'],
  ['.mjs', 'js'],
  ['.cjs', 'js'],
  ['.jsx', 'jsx'],
]
const SUPPORTED_LANGUAGES = new Map(LANGUAGE_ENTRIES)
const SUPPORTED_EXTENSIONS = mapNonEmpty(LANGUAGE_ENTRIES, ([extension]) => extension)
const TEST_FUNCTIONS = new Set(['it', 'test', 'describe', 'suite'])

export class TestFileTypescriptParser implements TestFileParser {
  parse(path: string, content: string): TestFileParseResult {
    const extension = extname(path)
    const language = SUPPORTED_LANGUAGES.get(extension)
    if (language === undefined) {
      return { kind: 'unsupported-extension', extension, supportedExtensions: SUPPORTED_EXTENSIONS }
    }

    const { program, comments, errors } = parseSync(path, content, { lang: language })
    const messages = errors.map((error) => error.message)
    if (isNonEmpty(messages)) {
      return { kind: 'syntax-error', messages }
    }

    const lineIndex = LineIndex.of(content)
    return {
      kind: 'parsed',
      comments: comments.map((comment) => toTestComment(comment, lineIndex)),
      testUnits: testUnitsOf(program, lineIndex),
    }
  }
}

function testUnitsOf(program: Program, lineIndex: LineIndex): TestUnit[] {
  return [...outermostCallsByLine(program, lineIndex)]
    .filter(([, call]) => isTestCall(call))
    .map(([line, call]) => ({ line, endLine: lineIndex.lineOf(call.end) }))
    .sort((a, b) => a.line - b.line)
}

function toTestComment(comment: Comment, lineIndex: LineIndex): TestComment {
  const { line, endLine, hasTextAround } = lineIndex.spanOf(comment.start, comment.end)
  return {
    line,
    endLine,
    body: comment.value,
    style: comment.type === 'Line' ? 'line' : 'block',
    hasCodeOnLine: hasTextAround,
  }
}

// `test.each([1])('x', fn)` has two calls that start at the same offset. The outer call ends later.
function outermostCallsByLine(program: Program, lineIndex: LineIndex): Map<number, CallExpression> {
  const outermost = new Map<number, CallExpression>()
  new Visitor({
    CallExpression: (call: CallExpression) => {
      const line = lineIndex.lineOf(call.start)
      const current = outermost.get(line)
      if (current === undefined || startsFirst(call, current)) outermost.set(line, call)
    },
  }).visit(program)
  return outermost
}

function startsFirst(call: CallExpression, other: CallExpression): boolean {
  return call.start < other.start || (call.start === other.start && call.end > other.end)
}

function isTestCall(call: CallExpression): boolean {
  const root = rootNameOf(call.callee)
  return root !== undefined && TEST_FUNCTIONS.has(root)
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
