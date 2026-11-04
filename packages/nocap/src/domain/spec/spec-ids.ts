import type { SpecId } from './spec-id.js'

export class SpecIds {
  private constructor(readonly values: readonly [SpecId, ...SpecId[]]) {}

  static of(ids: readonly [SpecId, ...SpecId[]]): SpecIds {
    const [first, ...others] = ids
    return others.reduce((specIds, id) => specIds.add(id), new SpecIds([first]))
  }

  private add(id: SpecId): SpecIds {
    if (this.has(id)) return this
    return new SpecIds([...this.values, id])
  }

  private has(id: SpecId): boolean {
    return this.values.some((kept) => kept.equals(id))
  }
}
