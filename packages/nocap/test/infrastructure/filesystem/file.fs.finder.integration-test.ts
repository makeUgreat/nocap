import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FileFsFinder } from '../../../src/infrastructure/filesystem/file.fs.finder.js'
import { projectWith } from '../../support/project.support.js'

const sorted = (paths: string[]) => [...paths].sort()

describe('패턴으로 파일 찾기', () => {
  it('패턴에 맞는 파일만 찾는다', async () => {
    const dir = projectWith({ 'docs/a.md': '', 'docs/b.txt': '', 'src/a.test.ts': '' })

    expect(await new FileFsFinder(dir).find(['docs/**/*.md'])).toEqual(['docs/a.md'])
  })

  it('패턴이 2개이면 두 패턴 중 하나에 맞는 파일을 모두 찾는다', async () => {
    const dir = projectWith({ 'docs/a.md': '', 'specs/b.md': '' })

    expect(sorted(await new FileFsFinder(dir).find(['docs/*.md', 'specs/*.md']))).toEqual(['docs/a.md', 'specs/b.md'])
  })

  it('점으로 시작하는 디렉토리 안의 파일도 찾는다', async () => {
    const dir = projectWith({ '.config/a.test.ts': '' })

    expect(await new FileFsFinder(dir).find(['**/*.test.ts'])).toEqual(['.config/a.test.ts'])
  })

  it('기준 디렉토리가 없으면 빈 목록을 반환한다', async () => {
    const dir = projectWith({})

    expect(await new FileFsFinder(join(dir, 'missing')).find(['**/*.md'])).toEqual([])
  })
})

// nocap: CC-002
describe('node_modules와 .git 안의 파일은 찾지 않음', () => {
  it('node_modules 안의 파일은 패턴에 맞아도 찾지 않는다', async () => {
    const dir = projectWith({ 'src/a.test.ts': '', 'node_modules/lib/b.test.ts': '', 'pkg/node_modules/c.test.ts': '' })

    expect(await new FileFsFinder(dir).find(['**/*.test.ts'])).toEqual(['src/a.test.ts'])
  })

  it('.git 안의 파일은 패턴에 맞아도 찾지 않는다', async () => {
    const dir = projectWith({ 'a.md': '', '.git/b.md': '' })

    expect(await new FileFsFinder(dir).find(['**/*.md'])).toEqual(['a.md'])
  })
})

// nocap: CC-005
describe('경로는 기준 디렉토리 상대 경로이고 구분자는 /', () => {
  it('하위 디렉토리의 파일 경로를 기준 디렉토리 상대 경로와 / 구분자로 반환한다', async () => {
    const dir = projectWith({ 'docs/specs/auth.md': '' })

    expect(await new FileFsFinder(dir).find(['docs/**/*.md'])).toEqual(['docs/specs/auth.md'])
  })
})
