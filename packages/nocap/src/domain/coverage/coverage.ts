import type { CoverageProblem, DuplicateId, UncoveredSpec, UnknownId } from './coverage-problem.js'
import type { SpecId } from '../spec/spec-id.js'
import type { SpecItem } from '../spec/spec-item.js'
import type { TestItem } from '../test/test-item.js'
import { hasTwoOrMore } from '../../lib/array-length.js'

/**
 * The judgment of one spec item.
 *
 * @remarks
 * `covered`: the id of the spec item is in no other spec item, and one or more test items point to it.
 * `testItems` are those test items, in the order they were given.
 * `uncovered-spec`: the id of the spec item is in no other spec item, and no test item points to it.
 * `duplicate-id`: another spec item has the same id, so the spec item is not judged as covered or uncovered.
 * `specItems` are all the spec items with that id, including this one, in the order they were given.
 */
export type SpecJudgment =
  | { readonly kind: 'covered'; readonly specItem: SpecItem; readonly testItems: readonly [TestItem, ...TestItem[]] }
  | { readonly kind: 'uncovered-spec'; readonly specItem: SpecItem }
  | { readonly kind: 'duplicate-id'; readonly specItem: SpecItem; readonly specItems: readonly [SpecItem, SpecItem, ...SpecItem[]] }

type IdGroup<T> = { readonly id: SpecId; readonly items: [T, ...T[]] }
type IdGroups<T> = ReadonlyMap<string, IdGroup<T>>

export class Coverage {
  private constructor(
    readonly problems: readonly CoverageProblem[],
    readonly specJudgments: readonly SpecJudgment[],
  ) {}

  get specCount(): number {
    return this.specJudgments.length
  }

  get coveredSpecCount(): number {
    return this.specJudgments.filter((judgment) => judgment.kind === 'covered').length
  }

  static of({ specItems, testItems }: { readonly specItems: readonly SpecItem[]; readonly testItems: readonly TestItem[] }): Coverage {
    const specGroups = groupById(specItems, (specItem) => [specItem.id])
    const testGroups = groupById(testItems, (testItem) => testItem.ids)

    const specJudgments = specItems.map((specItem) => Coverage.judgeSpecItem(specItem, specGroups, testGroups))
    const problems = [...Coverage.specProblemsOf(specJudgments), ...Coverage.unknownIdsOf(testGroups, specGroups)]

    return new Coverage(problems, specJudgments)
  }

  private static judgeSpecItem(specItem: SpecItem, specGroups: IdGroups<SpecItem>, testGroups: IdGroups<TestItem>): SpecJudgment {
    const specGroup = specGroups.get(specItem.id.key)
    if (specGroup !== undefined && hasTwoOrMore(specGroup.items)) return { kind: 'duplicate-id', specItem, specItems: specGroup.items }
    const testGroup = testGroups.get(specItem.id.key)
    if (testGroup !== undefined) return { kind: 'covered', specItem, testItems: testGroup.items }
    return { kind: 'uncovered-spec', specItem }
  }

  private static specProblemsOf(specJudgments: readonly SpecJudgment[]): (UncoveredSpec | DuplicateId)[] {
    const reportedIds = new Set<string>()
    return specJudgments.flatMap((judgment): (UncoveredSpec | DuplicateId)[] => {
      switch (judgment.kind) {
        case 'covered':
          return []
        case 'uncovered-spec':
          return [{ kind: 'uncovered-spec', specItem: judgment.specItem }]
        case 'duplicate-id': {
          const { id } = judgment.specItem
          if (reportedIds.has(id.key)) return []
          reportedIds.add(id.key)
          return [{ kind: 'duplicate-id', id, specItems: judgment.specItems }]
        }
      }
    })
  }

  private static unknownIdsOf(testGroups: IdGroups<TestItem>, specGroups: IdGroups<SpecItem>): UnknownId[] {
    return [...testGroups.values()]
      .filter(({ id }) => !specGroups.has(id.key))
      .map(({ id, items }) => ({ kind: 'unknown-id', id, testItems: items }))
  }
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
