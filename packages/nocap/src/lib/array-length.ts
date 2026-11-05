export function isNonEmpty<T>(items: readonly T[] | undefined): items is [T, ...T[]] {
  return items !== undefined && items.length > 0
}

export function hasTwoOrMore<T>(items: readonly T[]): items is readonly [T, T, ...T[]] {
  return items.length >= 2
}

export function mapNonEmpty<T, U>(items: readonly [T, ...T[]], map: (item: T) => U): [U, ...U[]] {
  const [first, ...rest] = items
  return [map(first), ...rest.map(map)]
}

export function mapTwoOrMore<T, U>(items: readonly [T, T, ...T[]], map: (item: T) => U): [U, U, ...U[]] {
  const [first, second, ...rest] = items
  return [map(first), map(second), ...rest.map(map)]
}
