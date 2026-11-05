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
    readonly unit: TestUnit,
    readonly comments: readonly [TestComment, ...TestComment[]],
  ) {}

  static collect(comments: readonly TestComment[], testUnits: readonly TestUnit[]): Collected {
    const ownLineByEndLine = new Map(comments.filter((comment) => !comment.hasCodeOnLine).map((comment) => [comment.endLine, comment]))
    const found: CommentsAboveTestUnit[] = []
    const inRuns = new Set<TestComment>()

    for (const unit of inLineOrder(testUnits)) {
      const run = runAbove(unit.line, ownLineByEndLine)
      if (!isNonEmpty(run)) continue
      run.forEach((comment) => inRuns.add(comment))
      found.push(new CommentsAboveTestUnit(unit, run))
    }

    const misplaced = comments
      .filter((comment) => !inRuns.has(comment))
      .map((comment): MisplacedTestComment => ({ kind: comment.hasCodeOnLine ? 'after-code' : 'not-above-test-call', comment }))
    return { found, misplaced }
  }
}

// A comment run attaches to the line where a test unit starts, so two units on one line would share the run.
// The parser contract rules this out, and nothing here can tell which of the two is right.
function inLineOrder(testUnits: readonly TestUnit[]): TestUnit[] {
  const sorted = [...testUnits].sort((a, b) => a.line - b.line)
  const repeated = sorted.find((unit, index) => index > 0 && sorted[index - 1]?.line === unit.line)
  if (repeated !== undefined) throw new Error(`Test units must start on different lines, got two on line ${repeated.line}`)
  return sorted
}

function runAbove(unitLine: number, ownLineByEndLine: ReadonlyMap<number, TestComment>): TestComment[] {
  const run: TestComment[] = []
  for (let comment = ownLineByEndLine.get(unitLine - 1); comment !== undefined; comment = ownLineByEndLine.get(comment.line - 1)) {
    run.unshift(comment)
  }
  return run
}
