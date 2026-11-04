import { extname } from 'node:path'
import { type CallExpression, type Comment, type Expression, parseSync, type Program, type Super, Visitor } from 'oxc-parser'
import type { TestFileParser, TestFileParseResult } from '../../application/test/test-file.parser.js'
import type { TagSite } from '../../domain/shared/tag-site.boundary.js'
import { isNonEmpty } from '../../lib/array-length.js'

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
const [[FIRST_EXTENSION], ...OTHER_LANGUAGE_ENTRIES] = LANGUAGE_ENTRIES
const SUPPORTED_EXTENSIONS: readonly [string, ...string[]] = [FIRST_EXTENSION, ...OTHER_LANGUAGE_ENTRIES.map(([extension]) => extension)]
const TEST_FUNCTIONS = new Set(['it', 'test', 'describe', 'suite'])

type CommentedTestCall = { readonly call: CallExpression; readonly comment: Comment }
/** `starts` holds the offset where each line begins. Index 0 is line 1. */
type SourceLines = { readonly content: string; readonly starts: readonly number[] }

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

    const lines = sourceLinesOf(content)
    const outermostCalls = outermostCallsByLine(program, lines)
    const sites = ownLineCommentsOf(comments, lines)
      .flatMap((comment) => commentedTestCallOf(comment, outermostCalls, lines) ?? [])
      .map((commented) => tagSiteOf(commented, lines))
    return { kind: 'parsed', sites }
  }
}

// `test.each([1])('x', fn)` has two calls that start at the same offset. The outer call ends later.
function outermostCallsByLine(program: Program, lines: SourceLines): Map<number, CallExpression> {
  const outermost = new Map<number, CallExpression>()
  new Visitor({
    CallExpression: (call: CallExpression) => {
      const line = lineOf(call, lines)
      const current = outermost.get(line)
      if (current === undefined || encloses(call, current)) outermost.set(line, call)
    },
  }).visit(program)
  return outermost
}

function encloses(outer: CallExpression, inner: CallExpression): boolean {
  return outer.start < inner.start || (outer.start === inner.start && outer.end > inner.end)
}

function ownLineCommentsOf(comments: readonly Comment[], lines: SourceLines): Comment[] {
  return comments.filter((comment) => comment.type === 'Line' && startsLine(comment, lines))
}

function commentedTestCallOf(
  comment: Comment,
  outermostCalls: ReadonlyMap<number, CallExpression>,
  lines: SourceLines,
): CommentedTestCall | undefined {
  const call = outermostCalls.get(lineOf(comment, lines) + 1)
  if (call === undefined || !isTestCall(call)) return undefined
  return { call, comment }
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

function tagSiteOf({ call, comment }: CommentedTestCall, lines: SourceLines): TagSite {
  return {
    line: lineOf(call, lines),
    comment: { line: lineOf(comment, lines), body: comment.value },
  }
}

function sourceLinesOf(content: string): SourceLines {
  const starts = [0]
  for (let newline = content.indexOf('\n'); newline !== -1; newline = content.indexOf('\n', newline + 1)) {
    starts.push(newline + 1)
  }
  return { content, starts }
}

function startsLine(node: { readonly start: number }, lines: SourceLines): boolean {
  const lineStart = lines.starts[lineOf(node, lines) - 1] ?? 0
  return lines.content.slice(lineStart, node.start).trim() === ''
}

// Binary search for the last line that starts at or before the node.
function lineOf(node: { readonly start: number }, lines: SourceLines): number {
  let low = 0
  let high = lines.starts.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if ((lines.starts[middle] ?? Infinity) <= node.start) low = middle
    else high = middle - 1
  }
  return low + 1
}
