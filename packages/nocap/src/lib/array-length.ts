export function isNonEmpty<T>(items: readonly T[] | undefined): items is [T, ...T[]] {
  return items !== undefined && items.length > 0
}

export function hasTwoOrMore<T>(items: readonly [T, ...T[]]): items is readonly [T, T, ...T[]] {
  return items.length >= 2
}
