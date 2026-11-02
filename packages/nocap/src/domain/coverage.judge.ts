import type { Coverage } from './coverage.js'
import type { DuplicateId } from './duplicate-id.js'
import type { SpecCoverage } from './spec-coverage.js'
import type { SpecItem } from './spec-item.js'
import type { TestItem } from './test-item.js'
import type { UnknownId } from './unknown-id.js'

export class CoverageJudge {
  judge(specItems: readonly SpecItem[], testItems: readonly TestItem[]): Coverage {
    const specItemsById = groupById(specItems, (specItem) => [specItem.id])
    const testItemsById = groupById(testItems, (testItem) => testItem.ids)
    return {
      specs: this.specCoverages(specItems, testItemsById),
      unknownIds: this.unknownIds(testItemsById, specItemsById),
      duplicateIds: this.duplicateIds(specItemsById),
    }
  }

  private specCoverages(specItems: readonly SpecItem[], testItemsById: Map<string, TestItem[]>): SpecCoverage[] {
    return specItems.map((specItem) => ({ specItem, testItems: testItemsById.get(specItem.id) ?? [] }))
  }

  private unknownIds(testItemsById: Map<string, TestItem[]>, specItemsById: Map<string, SpecItem[]>): UnknownId[] {
    return [...testItemsById]
      .filter(([id]) => !specItemsById.has(id))
      .map(([id, testItems]) => ({ id, testItems }))
  }

  private duplicateIds(specItemsById: Map<string, SpecItem[]>): DuplicateId[] {
    return [...specItemsById]
      .filter(([, specItems]) => specItems.length >= 2)
      .map(([id, specItems]) => ({ id, specItems }))
  }
}

function groupById<T>(items: readonly T[], idsOf: (item: T) => readonly string[]): Map<string, T[]> {
  const groups = new Map<string, Set<T>>()
  for (const item of items) {
    for (const id of idsOf(item)) {
      const group = groups.get(id) ?? new Set<T>()
      group.add(item)
      groups.set(id, group)
    }
  }
  return new Map([...groups].map(([id, group]) => [id, [...group]]))
}
