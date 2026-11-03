import type { Html, ListItem, Nodes, Paragraph, Root } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import type { SpecDocumentParser } from '../../application/spec/spec-document.parser.js'
import type { TagSite } from '../../domain/shared/tag-site.js'

const COMMENT_OPEN = '<!--'
const COMMENT_CLOSE = '-->'

type CommentedListItem = { readonly item: ListItem; readonly paragraph: Paragraph; readonly comment: Html }

export class SpecDocumentMarkdownParser implements SpecDocumentParser {
  parse(content: string): TagSite<string>[] {
    return listItemsInDocumentOrder(fromMarkdown(content))
      .flatMap((item) => commentedListItemOf(item) ?? [])
      .map((commented) => tagSiteOf(commented, content))
  }
}

function listItemsInDocumentOrder(document: Root): ListItem[] {
  return descendantsOf(document).filter((node): node is ListItem => node.type === 'listItem')
}

// A parent comes before its children, which is the order the nodes appear in the document.
function descendantsOf(node: Nodes): Nodes[] {
  const children = 'children' in node ? node.children : []
  return children.flatMap((child) => [child, ...descendantsOf(child)])
}

function commentedListItemOf(item: ListItem): CommentedListItem | undefined {
  const paragraph = firstParagraphOf(item)
  if (paragraph === undefined) return undefined
  const comment = trailingCommentOf(paragraph)
  if (comment === undefined) return undefined
  return { item, paragraph, comment }
}

function firstParagraphOf(item: ListItem): Paragraph | undefined {
  const first = item.children.find((child) => child.type !== 'list')
  return first?.type === 'paragraph' ? first : undefined
}

function trailingCommentOf(paragraph: Paragraph): Html | undefined {
  const last = paragraph.children.at(-1)
  const isComment = last?.type === 'html' && last.value.startsWith(COMMENT_OPEN) && last.value.endsWith(COMMENT_CLOSE)
  return isComment ? last : undefined
}

function tagSiteOf({ item, paragraph, comment }: CommentedListItem, content: string): TagSite<string> {
  return {
    line: startOf(item).line,
    subject: sentenceOf(paragraph, comment, content),
    comment: { line: startOf(comment).line, body: commentBodyOf(comment) },
  }
}

function sentenceOf(paragraph: Paragraph, comment: Html, content: string): string {
  return content
    .slice(startOf(paragraph).offset, startOf(comment).offset)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join(' ')
}

function commentBodyOf(comment: Html): string {
  return comment.value.slice(COMMENT_OPEN.length, -COMMENT_CLOSE.length)
}

function startOf(node: Nodes): { line: number; offset: number } {
  const start = node.position?.start
  if (start?.offset === undefined) {
    throw new Error(`Parsed markdown node has no position: ${node.type}`)
  }
  return { line: start.line, offset: start.offset }
}
