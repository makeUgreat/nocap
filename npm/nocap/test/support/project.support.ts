import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { onTestFinished } from 'vitest'

export function projectWith(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'nocap-project-'))
  onTestFinished(() => rmSync(dir, { recursive: true, force: true }))
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), content)
  }
  return dir
}

export function makeUnreadable(dir: string, path: string): void {
  chmodSync(join(dir, path), 0o000)
  onTestFinished(() => chmodSync(join(dir, path), 0o644))
}
