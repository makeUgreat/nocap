import { describe, expect, it } from 'vitest'
import { LineIndex } from './line-index.js'

const text = (...lines: string[]) => lines.join('\n')

describe('LineIndex', () => {
  describe('lineOf', () => {
    it('오프셋이 줄의 첫 글자이면 그 줄을 돌려준다', () => {
      const index = LineIndex.of(text('ab', 'cd'))

      expect([index.lineOf(0), index.lineOf(3)]).toEqual([1, 2])
    })

    it('오프셋이 줄바꿈 문자이면 그 줄바꿈이 끝내는 줄을 돌려준다', () => {
      expect(LineIndex.of(text('ab', 'cd')).lineOf(2)).toBe(1)
    })

    it('오프셋이 마지막 글자 뒤이면 마지막 줄을 돌려준다', () => {
      expect(LineIndex.of(text('ab', 'cd')).lineOf(5)).toBe(2)
    })
  })

  describe('spanOf', () => {
    it('범위가 걸친 첫 줄과 끝 줄을 돌려준다', () => {
      const content = text('a', '/* b', ' c */', 'd')
      const start = content.indexOf('/*')

      expect(LineIndex.of(content).spanOf(start, content.indexOf('*/') + 2)).toMatchObject({ line: 2, endLine: 3 })
    })

    it('범위 앞뒤의 같은 줄에 공백만 있으면 다른 글자가 없다고 본다', () => {
      const content = text('x', '  // a  ', 'y')
      const start = content.indexOf('//')

      expect(LineIndex.of(content).spanOf(start, start + '// a'.length).hasTextAround).toBe(false)
    })

    it('범위 앞의 같은 줄에 공백이 아닌 글자가 있으면 다른 글자가 있다고 본다', () => {
      const content = 'foo() // a'
      const start = content.indexOf('//')

      expect(LineIndex.of(content).spanOf(start, content.length).hasTextAround).toBe(true)
    })

    it('범위 뒤의 같은 줄에 공백이 아닌 글자가 있으면 다른 글자가 있다고 본다', () => {
      const content = '/* a */ foo()'

      expect(LineIndex.of(content).spanOf(0, '/* a */'.length).hasTextAround).toBe(true)
    })
  })
})
