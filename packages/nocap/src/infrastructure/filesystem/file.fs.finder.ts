import { glob } from 'tinyglobby'
import type { FileFinder } from '../../application/file/file.finder.js'

const EXCLUDED_DIRECTORIES = ['**/node_modules/**', '**/.git/**']

export class FileFsFinder implements FileFinder {
  constructor(private readonly rootDir: string) {}

  async find(patterns: readonly [string, ...string[]]): Promise<string[]> {
    return glob([...patterns], {
      cwd: this.rootDir,
      ignore: EXCLUDED_DIRECTORIES,
      dot: true,
      onlyFiles: true,
      expandDirectories: false,
    })
  }
}
