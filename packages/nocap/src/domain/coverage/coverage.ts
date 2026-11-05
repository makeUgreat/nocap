import type { CoverageProblem, DuplicateId, UncoveredSpec, UnknownId } from './coverage-problem.js'
import type { SpecId } from '../spec/spec-id.js'
import type { SpecItem } from '../spec/spec-item.js'
import type { TestItem } from '../test/test-item.js'
import { hasTwoOrMore } from '../../lib/array-length.js'

type Covered = { readonly kind: 'covered' }
type SpecJudgment = Covered | UncoveredSpec | DuplicateId

type IdGroup<T> = { readonly id: SpecId; readonly items: [T, ...T[]] }
type IdGroups<T> = ReadonlyMap<string, IdGroup<T>>

export class Coverage {
  private constructor(
    readonly problems: readonly CoverageProblem[],
    readonly specCount: number,
    readonly coveredSpecCount: number,
  ) {}

  static of({ specItems, testItems }: { readonly specItems: readonly SpecItem[]; readonly testItems: readonly TestItem[] }): Coverage {
    const specGroups = groupById(specItems, (specItem) => [specItem.id])
    const testGroups = groupById(testItems, (testItem) => testItem.ids.values)

    const specJudgments = [...specGroups.values()].map((specGroup) => Coverage.judgeSpecGroup(specGroup, testGroups))
    const unknownIds = Coverage.unknownIdsOf(testGroups, specGroups)

    return new Coverage(
      [...specJudgments.filter(isProblem), ...unknownIds],
      specItems.length,
      specJudgments.filter((judgment) => judgment.kind === 'covered').length,
    )
  }

  private static judgeSpecGroup({ id, items }: IdGroup<SpecItem>, testGroups: IdGroups<TestItem>): SpecJudgment {
    if (hasTwoOrMore(items)) return { kind: 'duplicate-id', id, specItems: items }
    if (testGroups.has(id.key)) return { kind: 'covered' }
    return { kind: 'uncovered-spec', specItem: items[0] }
  }

  private static unknownIdsOf(testGroups: IdGroups<TestItem>, specGroups: IdGroups<SpecItem>): UnknownId[] {
    return [...testGroups.values()]
      .filter(({ id }) => !specGroups.has(id.key))
      .map(({ id, items }) => ({ kind: 'unknown-id', id, testItems: items }))
  }
}

function isProblem(judgment: SpecJudgment): judgment is UncoveredSpec | DuplicateId {
  return judgment.kind !== 'covered'
}

function groupById<T>(items: readonly T[], idsOf: (item: T) => readonly SpecId[]): Map<string, IdGroup<T>> {
  const groups = new Map<string, IdGroup<T>>()
  for (const item of items) {
    for (const id of idsOf(item)) {
      const group = groups.get(id.key)
      if (group === undefined) groups.set(id.key, { id, items: [item] })
      else group.items.push(item)
    }
  }
  return groups
}
