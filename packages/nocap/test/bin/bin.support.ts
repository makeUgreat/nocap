import { execFileSync, spawnSync } from 'node:child_process'
import { join } from 'node:path'

const PACKAGE_DIR = join(import.meta.dirname, '..', '..')
const BIN = join(PACKAGE_DIR, 'dist', 'bin.js')

export type CliRun = { readonly stdout: string; readonly stderr: string; readonly exitCode: number | null }

export function buildCli(): void {
  execFileSync(join(PACKAGE_DIR, 'node_modules', '.bin', 'tsc'), ['-p', 'tsconfig.build.json'], { cwd: PACKAGE_DIR })
}

export function runCli(cwd: string, args: string[], env: Record<string, string> = {}): CliRun {
  const { FORCE_COLOR: _force, NO_COLOR: _no, ...inherited } = process.env
  const result = spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8', env: { ...inherited, ...env } })
  return { stdout: result.stdout, stderr: result.stderr, exitCode: result.status }
}
