import type { ListItem, Nodes, Paragraph } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import type { SpecItem } from '../../domain/spec-item.js'

const SPEC_TAG = /^<!--\s*@(\S+?)\s*-->$/

export function parseSpecDocument(source: string): SpecItem[] {
  const items: SpecItem[] = []
  collect(fromMarkdown(source), items)
  return items
}

function collect(node: Nodes, items: SpecItem[]): void {
  if (node.type === 'listItem') {
    const id = findSpecTagId(node)
    if (id !== undefined) items.push({ id })
  }
  if ('children' in node) {
    for (const child of node.children) collect(child, items)
  }
}

function findSpecTagId(item: ListItem): string | undefined {
  const ownBlocks = item.children.filter((child) => child.type !== 'list')
  const first = ownBlocks[0]
  if (first === undefined) return undefined
  if (first.type === 'paragraph') return specTagIdAtEnd(first)
  if (first.type === 'html' && ownBlocks.length === 1) return matchSpecTag(first.value)
  return undefined
}

function specTagIdAtEnd(paragraph: Paragraph): string | undefined {
  const last = paragraph.children.at(-1)
  if (last?.type !== 'html') return undefined
  return matchSpecTag(last.value)
}

function matchSpecTag(value: string): string | undefined {
  return SPEC_TAG.exec(value.trim())?.[1]
}
