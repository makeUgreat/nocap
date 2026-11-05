import { Location } from '../shared/location.js'
import type { SpecId } from '../spec/spec-id.js'
import { SpecIds } from '../spec/spec-ids.js'
import type { FormReason, InvalidTag, InvalidTagReason } from '../spec/invalid-tag.js'
import { type NotTag, Tag } from '../spec/tag.js'
import type { CommentsAboveTestUnit, MisplacedTestComment } from './comments-above-test-unit.js'
import type { TestComment } from './test-comment.boundary.js'
import { isNonEmpty } from '../../lib/array-length.js'

const BLOCK_LINE_START = /^[\s*]+/u

type ParsedRun = { readonly item: TestItem | undefined; readonly invalidTags: readonly InvalidTag[] }

export class TestItem {
  private constructor(
    readonly ids: SpecIds,
    readonly location: Location,
  ) {}

  static parse(path: string, run: CommentsAboveTestUnit): ParsedRun {
    const ids: SpecId[] = []
    const firstTagLines = new Map<string, number>()
    const invalidTags: InvalidTag[] = []

    for (const comment of run.comments) {
      const result = TestItem.tagOf(comment)
      if (result.kind === 'not-tag') continue
      if (result.kind !== 'valid') {
        invalidTags.push(invalid(result, path, comment))
        continue
      }

      const { id } = result.tag
      const firstTagLine = firstTagLines.get(id.key)
      if (firstTagLine !== undefined) {
        invalidTags.push(invalid({ kind: 'repeated-id', id, firstTagLine }, path, comment))
        continue
      }
      firstTagLines.set(id.key, comment.line)
      ids.push(id)
    }

    const item = isNonEmpty(ids) ? new TestItem(SpecIds.of(ids), Location.of(path, run.unitLine)) : undefined
    return { item, invalidTags }
  }

  static misplaced(path: string, { kind, comment }: MisplacedTestComment): NotTag | InvalidTag {
    if (TestItem.tagOf(comment).kind === 'not-tag') return { kind: 'not-tag' }
    return invalid({ kind }, path, comment)
  }

  private static tagOf(comment: TestComment): ReturnType<typeof Tag.parse> | FormReason {
    if (comment.style === 'line') return Tag.parse(comment.body)
    return tagLineIndexOf(comment.body) === undefined ? { kind: 'not-tag' } : { kind: 'block-comment' }
  }
}

function tagLineIndexOf(blockBody: string): number | undefined {
  const index = blockBody.split(/\r\n|\r|\n/u).findIndex((bodyLine) => Tag.parse(bodyLine.replace(BLOCK_LINE_START, '')).kind !== 'not-tag')
  return index === -1 ? undefined : index
}

// A block comment can span lines, so its tag is on the first of its lines that starts with "nocap:".
function tagLineOf(comment: TestComment): number {
  if (comment.style === 'line') return comment.line
  return comment.line + (tagLineIndexOf(comment.body) ?? 0)
}

function invalid(reason: InvalidTagReason, path: string, comment: TestComment): InvalidTag {
  return { ...reason, location: Location.of(path, tagLineOf(comment)) }
}
