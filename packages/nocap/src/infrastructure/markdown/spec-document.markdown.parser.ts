import type { SyntaxNode } from '@lezer/common'
import { parser } from '@lezer/markdown'
import type { SpecDocumentParser } from '../../application/spec-document.parser.js'
import type { SpecItem } from '../../domain/spec-item.js'

const SPEC_TAG = /^<!--\s*@(\S+)\s*-->$/
const NOT_OWN_BLOCKS = new Set(['ListMark', 'BulletList', 'OrderedList'])
type SpecTagMatch = { readonly kind: 'spec-tag'; readonly id: string } | { readonly kind: 'not-spec-tag' }

export class SpecDocumentMarkdownParser implements SpecDocumentParser {
  parse(content: string): SpecItem[] {
    return this.listItemsInDocumentOrder(parser.parse(content).topNode)
      .map((item) => this.specTagAt(item, content))
      .filter((tag) => tag.kind === 'spec-tag')
      .map((tag) => ({ id: tag.id }))
  }

  private listItemsInDocumentOrder(node: SyntaxNode): SyntaxNode[] {
    const nested = childrenOf(node).flatMap((child) => this.listItemsInDocumentOrder(child))
    return node.name === 'ListItem' ? [node, ...nested] : nested
  }

  private specTagAt(item: SyntaxNode, content: string): SpecTagMatch {
    const blocks = this.ownBlocksOf(item)
    const [firstBlock] = blocks
    if (firstBlock === undefined) return { kind: 'not-spec-tag' }
    if (this.isTagOnlyItem(blocks, content)) return this.specTagIn(textOf(firstBlock, content).trim())
    if (firstBlock.name === 'Paragraph') return this.trailingSpecTagOf(firstBlock, content)
    return { kind: 'not-spec-tag' }
  }

  private ownBlocksOf(item: SyntaxNode): SyntaxNode[] {
    return childrenOf(item).filter((child) => !NOT_OWN_BLOCKS.has(child.name))
  }

  private isTagOnlyItem(blocks: SyntaxNode[], content: string): boolean {
    const [onlyBlock] = blocks
    return blocks.length === 1 && onlyBlock?.name === 'CommentBlock' && isSingleComment(textOf(onlyBlock, content).trim())
  }

  private trailingSpecTagOf(paragraph: SyntaxNode, content: string): SpecTagMatch {
    const last = paragraph.lastChild
    if (last?.name !== 'Comment') return { kind: 'not-spec-tag' }
    const isAtEnd = content.slice(last.to, paragraph.to).trim() === ''
    return isAtEnd ? this.specTagIn(textOf(last, content)) : { kind: 'not-spec-tag' }
  }

  private specTagIn(comment: string): SpecTagMatch {
    const id = SPEC_TAG.exec(comment)?.[1]
    return id === undefined ? { kind: 'not-spec-tag' } : { kind: 'spec-tag', id }
  }
}

function childrenOf(node: SyntaxNode): SyntaxNode[] {
  const children: SyntaxNode[] = []
  for (let child = node.firstChild; child !== null; child = child.nextSibling) children.push(child)
  return children
}

function textOf(node: SyntaxNode, content: string): string {
  return content.slice(node.from, node.to)
}

function isSingleComment(text: string): boolean {
  return text.startsWith('<!--') && text.indexOf('-->') === text.length - '-->'.length
}
