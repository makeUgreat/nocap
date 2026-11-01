import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, posix } from 'node:path'
import { cruise, type ICruiseResult } from 'dependency-cruiser'
import { onTestFinished } from 'vitest'
import config from '../../dependency-cruiser/config.js'

export interface Violation {
  readonly rule: string
  readonly from: string
  readonly to: string
}

type CruiseViolation = ICruiseResult['summary']['violations'][number]

export function importing(from: string, to: string): Record<string, string> {
  return {
    [from]: `import { value } from '${relativeImport(from, to)}'\nexport const used = value\n`,
    [to]: 'export const value = 1\n',
  }
}

export async function findViolations(files: Record<string, string>): Promise<Violation[]> {
  const projectDir = createTempDir()
  writeFiles(projectDir, files)
  const result = await cruiseWithConfig(projectDir)
  return result.summary.violations.map(toViolation)
}

function createTempDir(): string {
  // tmpdir이 symlink를 거칠 수 있어서 실제 경로로 바꾼다. 예: macOS의 /var → /private/var
  // 바꾸지 않으면 위반 경로가 src/로 시작하지 않는다
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'nocap-depcruise-')))
  onTestFinished(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

function writeFiles(dir: string, files: Record<string, string>): void {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), content)
  }
}

async function cruiseWithConfig(baseDir: string): Promise<ICruiseResult> {
  const { output } = await cruise(['src'], { ...config.options, ruleSet: config, validate: true, outputType: 'json', baseDir })
  return JSON.parse(output as string) as ICruiseResult
}

function toViolation(violation: CruiseViolation): Violation {
  return { rule: violation.rule.name, from: violation.from, to: violation.to }
}

function relativeImport(from: string, to: string): string {
  const path = posix.relative(posix.dirname(from), to).replace(/\.ts$/, '.js')
  return path.startsWith('.') ? path : `./${path}`
}
