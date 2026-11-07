// `starts` holds the offset where each line begins. Index 0 is line 1.
export class LineIndex {
  private constructor(
    private readonly content: string,
    private readonly starts: readonly number[],
  ) {}

  static of(content: string): LineIndex {
    const starts = [0]
    for (let newline = content.indexOf('\n'); newline !== -1; newline = content.indexOf('\n', newline + 1)) {
      starts.push(newline + 1)
    }
    return new LineIndex(content, starts)
  }

  // Binary search for the last line that starts at or before the offset.
  lineOf(offset: number): number {
    let low = 0
    let high = this.starts.length - 1
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if ((this.starts[middle] ?? Infinity) <= offset) low = middle
      else high = middle - 1
    }
    return low + 1
  }

  // `hasTextAround` is true when anything but whitespace is on the first line before `start` or on the last line after `end`.
  spanOf(start: number, end: number): { line: number; endLine: number; hasTextAround: boolean } {
    const line = this.lineOf(start)
    const endLine = this.lineOf(end)
    const firstLineStart = this.starts[line - 1] ?? 0
    const nextLineStart = this.starts[endLine] ?? this.content.length
    const hasTextAround = this.content.slice(firstLineStart, start).trim() !== '' || this.content.slice(end, nextLineStart).trim() !== ''
    return { line, endLine, hasTextAround }
  }
}
