import type { TestComment } from './test-comment.boundary.js'
import type { TestUnit } from './test-unit.boundary.js'
import { isNonEmpty } from '../../lib/array-length.js'

export type MisplacedTestComment = {
  readonly kind: 'after-code' | 'not-above-test-call'
  readonly comment: TestComment
}

type Collected = { readonly found: readonly CommentsAboveTestUnit[]; readonly misplaced: readonly MisplacedTestComment[] }

export class CommentsAboveTestUnit {
  private constructor(
    readonly unitLine: number,
    readonly comments: readonly [TestComment, ...TestComment[]],
  ) {}

  static collect(comments: readonly TestComment[], testUnits: readonly TestUnit[]): Collected {
    const ownLineByEndLine = new Map(comments.filter((comment) => !comment.hasCodeOnLine).map((comment) => [comment.endLine, comment]))
    const unitLines = [...new Set(testUnits.map(({ line }) => line))].sort((a, b) => a - b)
    const found: CommentsAboveTestUnit[] = []
    const inRuns = new Set<TestComment>()

    for (const unitLine of unitLines) {
      const run = runAbove(unitLine, ownLineByEndLine)
      if (!isNonEmpty(run)) continue
      run.forEach((comment) => inRuns.add(comment))
      found.push(new CommentsAboveTestUnit(unitLine, run))
    }

    const misplaced = comments
      .filter((comment) => !inRuns.has(comment))
      .map((comment): MisplacedTestComment => ({ kind: comment.hasCodeOnLine ? 'after-code' : 'not-above-test-call', comment }))
    return { found, misplaced }
  }
}

function runAbove(unitLine: number, ownLineByEndLine: ReadonlyMap<number, TestComment>): TestComment[] {
  const run: TestComment[] = []
  for (let comment = ownLineByEndLine.get(unitLine - 1); comment !== undefined; comment = ownLineByEndLine.get(comment.line - 1)) {
    run.unshift(comment)
  }
  return run
}
