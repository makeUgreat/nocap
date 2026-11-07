import { describe, expect, it } from 'vitest'
import { FileFsReader } from '../../../src/infrastructure/filesystem/file.fs.reader.js'
import { makeUnreadable, projectWith } from '../../support/project.support.js'

describe('파일 읽기', () => {
  it('기준 디렉토리에 대한 상대 경로의 파일을 UTF-8 텍스트로 읽는다', async () => {
    const dir = projectWith({ 'docs/a.md': '- 계정을 잠금 <!-- nocap: A-001 -->' })

    expect(await new FileFsReader(dir).read('docs/a.md')).toEqual({ kind: 'read', content: '- 계정을 잠금 <!-- nocap: A-001 -->' })
  })
})

// nocap: CC-006
describe('읽지 못한 파일을 경로와 함께 보고', () => {
  it('없는 파일이면 읽기 실패를 돌려준다', async () => {
    const dir = projectWith({})

    expect((await new FileFsReader(dir).read('missing.md')).kind).toBe('read-error')
  })

  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)('읽기 권한이 없는 파일이면 읽기 실패를 돌려준다', async () => {
    const dir = projectWith({ 'a.md': 'x' })
    makeUnreadable(dir, 'a.md')

    expect((await new FileFsReader(dir).read('a.md')).kind).toBe('read-error')
  })
})
