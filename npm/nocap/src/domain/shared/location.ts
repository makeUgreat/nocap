export class Location {
  private constructor(
    readonly path: string,
    readonly line: number,
  ) {}

  static of(path: string, line: number): Location {
    Location.assertPathNotEmpty(path)
    Location.assertLineIsPositiveInteger(line)
    return new Location(path, line)
  }

  private static assertPathNotEmpty(path: string): void {
    if (path === '') throw new Error('Location path must not be empty')
  }

  private static assertLineIsPositiveInteger(line: number): void {
    const isPositiveInteger = Number.isInteger(line) && line >= 1
    if (!isPositiveInteger) throw new Error(`Location line must be an integer of 1 or more, got ${line}`)
  }
}
