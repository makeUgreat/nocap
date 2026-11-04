export interface FileFinder {
  /**
   * Finds the files that match any of the glob patterns.
   *
   * @param patterns - Glob patterns relative to the root directory of the finder.
   * @returns Paths relative to the root directory, with `/` as the separator.
   * Files under a `node_modules` or `.git` directory are left out.
   * The order is not specified, and a path may appear more than once.
   * Empty when no file matches or the root directory does not exist.
   */
  find(patterns: readonly [string, ...string[]]): Promise<string[]>
}
