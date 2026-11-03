import { describe, expect, it } from 'vitest'
import { TestFile } from '../../domain/test/test-file.js'
import { TestFileTypescriptParser } from './test-file.typescript.parser.js'

const parser = new TestFileTypescriptParser()
const testFileOf = (path: string, content: string) => {
  const result = parser.parse(path, content)
  if (result.kind !== 'parsed') throw new Error(`expected parsed but got ${result.kind}`)
  return TestFile.of(path, result.sites)
}
const idsOf = (content: string, fileName = 'a.test.ts') =>
  testFileOf(fileName, content).items.map((item) => item.ids.values.map((id) => id.value))
const code = (...lines: string[]) => lines.join('\n')

// nocap: TP-001
describe('테스트 태그가 붙은 테스트 호출마다 테스트 항목 생성', () => {
  it('테스트 태그가 붙은 테스트 호출이 2개이면 테스트 항목 2개를 반환한다', () => {
    const content = code('// nocap: A-001', "it('a', () => {})", '// nocap: A-002', "it('b', () => {})")

    expect(idsOf(content)).toEqual([['A-001'], ['A-002']])
  })

  it('테스트 묶음과 그 안의 테스트에 각각 태그가 있으면 각각 테스트 항목을 만든다', () => {
    const content = code('// nocap: A-001', "describe('a', () => {", '  // nocap: A-002', "  it('b', () => {})", '})')

    expect(idsOf(content)).toEqual([['A-001'], ['A-002']])
  })
})

// nocap: TP-002
describe('테스트 태그의 모든 ID를 쓴 순서대로 테스트 항목의 ID로 사용', () => {
  it('테스트 태그에 ID가 2개이면 두 ID를 쓴 순서대로 가진 테스트 항목 1개를 반환한다', () => {
    const content = code('// nocap: A-002, A-001', "it('a', () => {})")

    expect(idsOf(content)).toEqual([['A-002', 'A-001']])
  })
})

// nocap: TP-020
describe('테스트 태그에 여러 번 쓴 ID는 처음 한 번만 사용', () => {
  it('테스트 태그에 같은 ID를 2번 쓰면 처음 나온 자리에 1번만 가진 테스트 항목을 반환한다', () => {
    const content = code('// nocap: A-001, A-002, A-001', "it('a', () => {})")

    expect(idsOf(content)).toEqual([['A-001', 'A-002']])
  })
})

// nocap: TP-003
describe('테스트 태그가 없는 테스트 호출은 테스트 항목이 아님', () => {
  it('테스트 태그가 없는 테스트 호출만 있으면 빈 목록을 반환한다', () => {
    expect(idsOf(code("describe('a', () => {", "  it('b', () => {})", '})'))).toEqual([])
  })

  it('nocap:으로 시작하지 않는 라인 주석은 테스트 태그로 보지 않는다', () => {
    expect(idsOf(code('// TODO-123', "it('a', () => {})"))).toEqual([])
  })
})

// nocap: TP-004
describe('it, test, describe, suite 호출만 테스트 호출로 인식', () => {
  it('it, test, describe, suite 위의 테스트 태그는 모두 테스트 항목이 된다', () => {
    const content = ['it', 'test', 'describe', 'suite'].flatMap((name, i) => [`// nocap: A-00${i}`, `${name}('x', () => {})`]).join('\n')

    expect(idsOf(content)).toEqual([['A-000'], ['A-001'], ['A-002'], ['A-003']])
  })

  it('목록에 없는 이름의 호출 위의 테스트 태그는 테스트 항목이 되지 않는다', () => {
    expect(idsOf(code('// nocap: A-001', "context('x', () => {})"))).toEqual([])
  })
})

// nocap: TP-005
describe('수식자가 붙은 호출도 테스트 호출로 인식', () => {
  it('멤버 수식자가 붙은 호출 위의 테스트 태그는 테스트 항목이 된다', () => {
    expect(idsOf(code('// nocap: A-001', "describe.concurrent.only('x', () => {})"))).toEqual([['A-001']])
  })

  it('each 호출로 이어진 테스트 호출은 테스트 항목 1개가 된다', () => {
    expect(idsOf(code('// nocap: A-001', "test.each([1, 2])('x %i', () => {})"))).toEqual([['A-001']])
  })

  it('태그된 템플릿으로 이어진 테스트 호출은 테스트 항목 1개가 된다', () => {
    const content = code('// nocap: A-001', 'it.each`', '  a', '  ${1}', "`('x', () => {})")

    expect(idsOf(content)).toEqual([['A-001']])
  })
})

// nocap: TP-026
describe('테스트 태그 아래 줄에서 시작하는 가장 바깥 호출만 테스트 호출로 인식', () => {
  it('아래 줄에서 테스트 묶음과 그 안의 테스트가 함께 시작하면 테스트 묶음만 테스트 항목이 된다', () => {
    const content = code('// nocap: A-001', "describe('a', () => { it('b', () => {}) })")

    expect(testFileOf('a.test.ts', content).items.map((item) => item.location.line)).toEqual([2])
  })

  it('가장 바깥 호출이 테스트 호출이 아니면 그 안의 테스트 호출은 테스트 항목이 되지 않는다', () => {
    expect(idsOf(code('// nocap: A-001', "wrap(it('a', () => {}))"))).toEqual([])
  })
})

// nocap: TP-006
describe('테스트 호출 바로 위 줄의 라인 주석만 테스트 태그로 인식', () => {
  it('테스트 태그와 테스트 호출 사이에 빈 줄이 있으면 테스트 항목을 만들지 않는다', () => {
    expect(idsOf(code('// nocap: A-001', '', "it('a', () => {})"))).toEqual([])
  })

  it('테스트 태그와 테스트 호출 사이에 다른 주석이 있으면 테스트 항목을 만들지 않는다', () => {
    expect(idsOf(code('// nocap: A-001', '// 설명', "it('a', () => {})"))).toEqual([])
  })

  it('다른 주석 아래 바로 위 줄에 있는 테스트 태그는 인식한다', () => {
    expect(idsOf(code('// 설명', '// nocap: A-001', "it('a', () => {})"))).toEqual([['A-001']])
  })
})

// nocap: TP-007
describe('블록 주석과 코드 뒤에 붙은 라인 주석은 테스트 태그가 아님', () => {
  it('바로 위 줄의 블록 주석은 테스트 태그로 보지 않는다', () => {
    expect(idsOf(code('/* nocap: A-001 */', "it('a', () => {})"))).toEqual([])
  })

  it('테스트 호출과 같은 줄 끝의 라인 주석은 테스트 태그로 보지 않는다', () => {
    expect(idsOf("it('a', () => {}) // nocap: A-001")).toEqual([])
  })

  it('바로 위 줄에서 다른 코드 뒤에 붙은 라인 주석은 테스트 태그로 보지 않는다', () => {
    expect(idsOf(code('foo() // nocap: A-001', "it('a', () => {})"))).toEqual([])
  })
})

// nocap: TP-021
describe('본문이 nocap:으로 시작하는 라인 주석만 테스트 태그로 인식', () => {
  it('@로 시작하는 라인 주석은 테스트 태그로 보지 않는다', () => {
    expect(idsOf(code('// @A-001', "it('a', () => {})"))).toEqual([])
  })

  it('테스트 호출 바로 위의 @ts-expect-error는 테스트 태그로 보지 않는다', () => {
    expect(idsOf(code('// @ts-expect-error', "it('a', () => {})"))).toEqual([])
  })

  it('접두어가 대문자이면 테스트 태그로 보지 않는다', () => {
    expect(idsOf(code('// NOCAP: A-001', "it('a', () => {})"))).toEqual([])
  })

  it('nocap과 콜론 사이에 공백이 있으면 테스트 태그로 보지 않는다', () => {
    expect(idsOf(code('// nocap : A-001', "it('a', () => {})"))).toEqual([])
  })

  it('테스트 태그가 아닌 라인 주석은 틀린 태그로 보고하지 않는다', () => {
    expect(parsedOf(code('// @A.1', "it('a', () => {})")).invalidTags).toEqual([])
  })
})

// nocap: TP-008
describe('콜론 뒤와 쉼표 앞뒤 공백과 무관하게 테스트 태그 인식', () => {
  it('콜론 뒤와 쉼표 앞뒤에 공백이 없어도 공백이 있을 때와 같은 ID를 반환한다', () => {
    expect(idsOf(code('//nocap:A-001,A-002', "it('a', () => {})"))).toEqual([['A-001', 'A-002']])
  })
})

// nocap: TP-022
describe('마지막 ID 뒤의 쉼표와 무관하게 테스트 태그 인식', () => {
  it('마지막 ID 뒤에 쉼표가 있어도 쉼표가 없을 때와 같은 ID를 반환한다', () => {
    expect(idsOf(code('// nocap: A-001, A-002,', "it('a', () => {})"))).toEqual([['A-001', 'A-002']])
  })
})

// nocap: TP-010
describe('문자열과 템플릿 리터럴 안의 태그 무시', () => {
  it('바로 위 줄이 템플릿 리터럴 안의 // nocap: ID이면 테스트 항목을 만들지 않는다', () => {
    const content = code('const s = `', '// nocap: A-001', "`; it('a', () => {})")

    expect(idsOf(content)).toEqual([])
  })

  it('바로 위 줄이 문자열 안의 // nocap: ID이면 테스트 항목을 만들지 않는다', () => {
    const content = code("const s = '\\", "// nocap: A-001'", "it('a', () => {})")

    expect(idsOf(content)).toEqual([])
  })
})

// nocap: TP-011
describe('파일 확장자로 언어 결정', () => {
  it('.ts 파일의 <T> 형 변환을 TypeScript로 읽는다', () => {
    expect(idsOf(code('const x = <number>y', '// nocap: A-001', "it('a', () => {})"), 'a.test.ts')).toEqual([['A-001']])
  })

  it('.tsx 파일의 JSX를 읽는다', () => {
    expect(idsOf(code('const x = <div />', '// nocap: A-001', "it('a', () => {})"), 'a.test.tsx')).toEqual([['A-001']])
  })

  it('.js 파일의 타입 주석은 문법 오류로 본다', () => {
    expect(parser.parse('a.test.js', 'const x: number = 1').kind).toBe('syntax-error')
  })

  it('.jsx 파일의 JSX를 읽는다', () => {
    expect(idsOf(code('const x = <div />', '// nocap: A-001', "it('a', () => {})"), 'a.test.jsx')).toEqual([['A-001']])
  })

  it('.mts, .cts, .mjs, .cjs 파일을 읽는다', () => {
    const content = code('// nocap: A-001', "it('a', () => {})")

    expect(['a.mts', 'a.cts', 'a.mjs', 'a.cjs'].map((name) => idsOf(content, name))).toEqual([
      [['A-001']],
      [['A-001']],
      [['A-001']],
      [['A-001']],
    ])
  })
})

// nocap: TP-012
describe('지원하지 않는 확장자는 오류', () => {
  it('지원하지 않는 확장자이면 그 확장자를 담은 오류를 반환한다', () => {
    expect(parser.parse('a.test.py', '// nocap: A-001\nit()')).toEqual({ kind: 'unsupported-extension', extension: '.py' })
  })
})

// nocap: TP-013
describe('문법 오류가 있는 테스트 파일은 오류', () => {
  it('문법 오류가 있으면 테스트 항목 없이 오류 메시지를 반환한다', () => {
    const result = parser.parse('a.test.ts', code('// nocap: A-001', "it('a', () => {})", 'const = 1'))

    expect(result.kind === 'syntax-error' && result.messages.length > 0).toBe(true)
  })
})

describe('빈 파일', () => {
  it('빈 문자열이면 빈 목록을 반환한다', () => {
    expect(idsOf('')).toEqual([])
  })
})

describe('파일 마지막 줄의 라인 주석', () => {
  it('줄바꿈 없이 끝나는 마지막 줄의 테스트 태그는 첫 줄의 테스트 호출에 연결하지 않는다', () => {
    expect(idsOf(code("it('a', () => {})", '// nocap: A-001'))).toEqual([])
  })
})
const parsedOf = (content: string) => testFileOf('src/a.test.ts', content)

// nocap: TP-014
describe('테스트 파일 경로와 테스트 호출이 시작하는 줄을 테스트 항목의 위치로 사용', () => {
  it('테스트 호출이 3번째 줄에 있으면 테스트 파일 경로와 줄 3을 위치로 반환한다', () => {
    const content = code('', '// nocap: A-001', "it('a', () => {})")

    expect(parsedOf(content).items[0]?.location).toEqual({ path: 'src/a.test.ts', line: 3 })
  })

  it('테스트 호출이 여러 줄이면 호출이 시작하는 줄을 반환한다', () => {
    const content = code('// nocap: A-001', 'it(', "  'a',", '  () => {},', ')')

    expect(parsedOf(content).items[0]?.location.line).toBe(2)
  })
})

// nocap: TP-018
describe('ID 하나라도 규칙을 어긴 테스트 태그로는 테스트 항목을 만들지 않음', () => {
  it('ID 2개 중 하나만 규칙을 어겨도 테스트 항목을 만들지 않는다', () => {
    expect(idsOf(code('// nocap: A-001, A.1', "it('a', () => {})"))).toEqual([])
  })

  it('쉼표 없이 공백으로 나뉜 ID가 있으면 테스트 항목을 만들지 않는다', () => {
    expect(idsOf(code('// nocap: A-001 A-002', "it('a', () => {})"))).toEqual([])
  })
})

// nocap: TP-023
describe('ID가 누락된 테스트 태그로는 테스트 항목을 만들지 않음', () => {
  it('nocap: 뒤에 ID가 없으면 테스트 항목을 만들지 않는다', () => {
    expect(idsOf(code('// nocap:', "it('a', () => {})"))).toEqual([])
  })

  it('쉼표 사이가 비어 있으면 테스트 항목을 만들지 않는다', () => {
    expect(idsOf(code('// nocap: A-001,,A-002', "it('a', () => {})"))).toEqual([])
  })
})

// nocap: TP-019
describe('틀린 테스트 태그의 위치와 틀린 이유를 보고', () => {
  it('ID 규칙을 어긴 테스트 태그가 있으면 태그가 있는 줄과 규칙을 어긴 ID만 반환한다', () => {
    const content = code("it('a', () => {})", '// nocap: A-001, A.1', "it('b', () => {})")

    expect(parsedOf(content).invalidTags).toEqual([
      {
        kind: 'id-rule-violation',
        location: { path: 'src/a.test.ts', line: 2 },
        invalidCandidates: [{ kind: 'invalid-char', value: 'A.1', firstInvalidChar: '.' }],
      },
    ])
  })

  it('ID가 누락된 테스트 태그가 있으면 태그가 있는 줄과 ID 누락을 반환한다', () => {
    const content = code("it('a', () => {})", '// nocap:', "it('b', () => {})")

    expect(parsedOf(content).invalidTags).toEqual([{ kind: 'missing-id', location: { path: 'src/a.test.ts', line: 2 } }])
  })

  it('모든 테스트 태그의 ID가 규칙을 지키면 보고할 태그가 없다', () => {
    expect(parsedOf(code('// nocap: A-001', "it('a', () => {})")).invalidTags).toEqual([])
  })
})

// nocap: TP-025
describe('테스트 태그가 있는 줄을 틀린 테스트 태그의 위치로 사용', () => {
  it('테스트 호출이 5줄에서 시작하면 틀린 테스트 태그의 위치의 줄은 4다', () => {
    const content = code("it('a', () => {})", '', '', '// nocap: A.1', "it('b', () => {})")

    expect(parsedOf(content).invalidTags.map((invalidTag) => invalidTag.location)).toEqual([{ path: 'src/a.test.ts', line: 4 }])
  })
})

// nocap: TP-024
describe('틀린 테스트 태그 1개에 틀린 이유 1개를 정해진 순서로 보고', () => {
  it('ID 누락과 ID 규칙 위반을 함께 어기면 ID 누락만 보고한다', () => {
    const invalidTags = parsedOf(code('// nocap: A.1,,A-002', "it('a', () => {})")).invalidTags

    expect(invalidTags.map((invalidTag) => invalidTag.kind)).toEqual(['missing-id'])
  })
})

describe('인자가 없는 테스트 호출', () => {
  it('인자가 없는 테스트 호출 위의 테스트 태그도 테스트 항목이 된다', () => {
    expect(idsOf(code('// nocap: A-001', 'it()'))).toEqual([['A-001']])
  })
})
