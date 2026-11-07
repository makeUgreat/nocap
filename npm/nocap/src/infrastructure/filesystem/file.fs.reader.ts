import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { FileReader, FileReadResult } from '../../application/file/file.reader.js'

export class FileFsReader implements FileReader {
  constructor(private readonly rootDir: string) {}

  async read(path: string): Promise<FileReadResult> {
    try {
      const content = await readFile(join(this.rootDir, path), 'utf8')
      return { kind: 'read', content }
    } catch (error) {
      return { kind: 'read-error', message: messageOf(error) }
    }
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
