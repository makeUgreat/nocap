export function isNonEmpty<T>(items: readonly T[] | undefined): items is [T, ...T[]] {
  return items !== undefined && items.length > 0
}
