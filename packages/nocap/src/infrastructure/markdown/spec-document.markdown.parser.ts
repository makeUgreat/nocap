import type { Html, ListItem, Nodes, Paragraph } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import type { SpecDocumentParser, SpecDocumentParseResult } from '../../application/spec/spec-document.parser.js'
import type { SourceComment } from '../../domain/shared/source-comment.boundary.js'
import type { SpecComment, SpecCommentPlacement } from '../../domain/spec/spec-comment.boundary.js'

const COMMENT_OPEN = '<!--'
const COMMENT_CLOSE = '-->'
const COMMENT = /<!--([\s\S]*?)-->/gu

type PlacedHtml = { readonly html: Html; readonly listItem: ListItem | undefined }

export class SpecDocumentMarkdownParser implements SpecDocumentParser {
  parse(content: string): SpecDocumentParseResult {
    const document = fromMarkdown(content)
    return { comments: htmlNodesInDocumentOrder(document).flatMap((placed) => commentsOf(placed, content)) }
  }
}

// Code blocks and inline code are not HTML nodes, so the comments in them are never found.
// A parent comes before its children, which is the order the nodes appear in the document.
function htmlNodesInDocumentOrder(node: Nodes, listItem?: ListItem): PlacedHtml[] {
  if (node.type === 'html') return [{ html: node, listItem }]
  const children = 'children' in node ? node.children : []
  const holder = node.type === 'listItem' ? node : listItem
  return children.flatMap((child) => htmlNodesInDocumentOrder(child, holder))
}

function commentsOf({ html, listItem }: PlacedHtml, content: string): SpecComment[] {
  const placement = placementOf(html, listItem, content)
  return commentsIn(html).map((comment) => ({ ...comment, placement }))
}

function placementOf(html: Html, listItem: ListItem | undefined, content: string): SpecCommentPlacement {
  if (listItem === undefined) return { kind: 'outside-item' }
  const firstBlock = listItem.children.find((child) => child.type !== 'list')
  if (firstBlock?.type === 'paragraph' && endsWithComment(firstBlock, html)) {
    return { kind: 'first-paragraph-end', itemLine: startOf(listItem).line, text: sentenceOf(firstBlock, html, content) }
  }
  const isWholeFirstBlock = firstBlock === html && html.value.replace(COMMENT, '').trim() === ''
  return isWholeFirstBlock ? { kind: 'first-block' } : { kind: 'elsewhere-in-item' }
}

function endsWithComment(paragraph: Paragraph, html: Html): boolean {
  return paragraph.children.at(-1) === html && html.value.startsWith(COMMENT_OPEN) && html.value.endsWith(COMMENT_CLOSE)
}

// One HTML node can hold several comments and other HTML, for example `<div><!-- a --></div>`.
function commentsIn(html: Html): SourceComment[] {
  const start = startOf(html).line
  return [...html.value.matchAll(COMMENT)].map((match) => ({
    line: start + newlinesIn(html.value.slice(0, match.index)),
    body: match[1] ?? '',
  }))
}

function newlinesIn(text: string): number {
  return text.split('\n').length - 1
}

function sentenceOf(paragraph: Paragraph, comment: Html, content: string): string {
  return content
    .slice(startOf(paragraph).offset, startOf(comment).offset)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join(' ')
}

function startOf(node: Nodes): { line: number; offset: number } {
  const start = node.position?.start
  if (start?.offset === undefined) {
    throw new Error(`Parsed markdown node has no position: ${node.type}`)
  }
  return { line: start.line, offset: start.offset }
}
