import { describe, expect, it } from 'vitest'
import { SpecDocumentMarkdownParser } from './spec-document.markdown.parser.js'

const parser = new SpecDocumentMarkdownParser()
const ids = (content: string) => parser.parse(content).map((item) => item.id)

// @MD-001
describe('명세 태그가 있는 리스트 항목마다 명세 항목 생성', () => {
  it('명세 태그가 있는 리스트 항목이 2개이면 명세 항목 2개를 반환한다', () => {
    const content = ['- 계정을 잠금 <!--@A-001-->', '- 잠금을 풂 <!--@A-002-->'].join('\n')

    expect(ids(content)).toEqual(['A-001', 'A-002'])
  })

  it('하위 리스트 항목에 명세 태그가 있으면 상위 항목과 별개로 명세 항목을 만든다', () => {
    const content = ['- 로그인 실패 처리 <!--@A-001-->', '  - 5회 실패하면 잠금 <!--@A-002-->'].join('\n')

    expect(ids(content)).toEqual(['A-001', 'A-002'])
  })

  it('리스트 밖의 문단과 헤딩에 있는 명세 태그로는 명세 항목을 만들지 않는다', () => {
    const content = ['# 제목 <!--@A-001-->', '', '문단 <!--@A-002-->'].join('\n')

    expect(ids(content)).toEqual([])
  })
})

// @MD-002
describe('명세 태그의 ID를 명세 항목의 ID로 사용', () => {
  it('명세 태그의 @ 뒤 값을 명세 항목의 ID로 반환한다', () => {
    expect(ids('- 계정을 잠금 <!--@AUTH-001-->')).toEqual(['AUTH-001'])
  })
})

// @MD-003
describe('명세 태그가 없는 리스트 항목은 명세 항목이 아님', () => {
  it('명세 태그가 없는 리스트 항목만 있으면 빈 목록을 반환한다', () => {
    expect(ids('- 계정을 잠금\n- 잠금을 풂')).toEqual([])
  })

  it('@가 없는 주석은 명세 태그로 보지 않는다', () => {
    expect(ids('- 계정을 잠금 <!-- TODO-123 -->')).toEqual([])
  })
})

// @MD-008
describe('문장 없이 명세 태그만 있는 리스트 항목도 명세 항목', () => {
  it('명세 태그만 있는 리스트 항목이면 명세 항목을 반환한다', () => {
    expect(ids('- <!--@A-001-->')).toEqual(['A-001'])
  })

  it('명세 태그만 있는 항목에 하위 리스트가 있어도 명세 항목을 반환한다', () => {
    const content = ['- <!--@A-001-->', '  - 5회 실패하면 잠금 <!--@A-002-->'].join('\n')

    expect(ids(content)).toEqual(['A-001', 'A-002'])
  })

  it('명세 태그 아래에 다른 문단이 있으면 명세 항목을 만들지 않는다', () => {
    const content = ['- <!--@A-001-->', '', '  설명 문단'].join('\n')

    expect(ids(content)).toEqual([])
  })
})

// @MD-004
describe('주석 안쪽 공백과 무관하게 명세 태그 인식', () => {
  it('주석 안쪽에 공백이 있어도 공백이 없을 때와 같은 ID를 반환한다', () => {
    expect(ids('- 계정을 잠금 <!--  @A-001  -->')).toEqual(['A-001'])
  })
})

// @MD-005
describe('코드 안의 명세 태그 무시', () => {
  it('인라인 코드 안의 명세 태그는 명세 태그로 보지 않는다', () => {
    expect(ids('- 형식은 `<!--@A-001-->`임')).toEqual([])
  })

  it('코드 블록 안의 명세 태그는 명세 태그로 보지 않는다', () => {
    const content = ['```md', '- 계정을 잠금 <!--@A-001-->', '```'].join('\n')

    expect(ids(content)).toEqual([])
  })

  it('리스트 항목 안의 코드 블록에 있는 명세 태그는 명세 태그로 보지 않는다', () => {
    const content = ['- 예시', '', '  ```md', '  - 계정을 잠금 <!--@A-001-->', '  ```'].join('\n')

    expect(ids(content)).toEqual([])
  })
})

// @MD-006
describe('리스트 항목 텍스트 맨 끝의 명세 태그만 인식', () => {
  it('명세 태그가 텍스트 맨 앞에 있으면 명세 항목을 만들지 않는다', () => {
    expect(ids('- <!--@A-001--> 계정을 잠금')).toEqual([])
  })

  it('명세 태그 뒤에 공백만 있으면 맨 끝의 명세 태그로 본다', () => {
    expect(ids('- 계정을 잠금 <!--@A-001-->   ')).toEqual(['A-001'])
  })

  it('명세 태그가 텍스트 중간에 있으면 명세 항목을 만들지 않는다', () => {
    expect(ids('- 계정을 <!--@A-001--> 잠금')).toEqual([])
  })
})

// @MD-007
describe('리스트 항목의 첫 문단 끝을 맨 끝으로 봄', () => {
  it('명세 태그가 둘째 문단 끝에 있으면 명세 항목을 만들지 않는다', () => {
    const content = ['- 계정을 잠금', '', '  관리자에게도 적용함 <!--@A-001-->'].join('\n')

    expect(ids(content)).toEqual([])
  })

  it('하위 리스트 항목 끝의 명세 태그는 상위 항목의 명세 태그로 보지 않는다', () => {
    const content = ['- 로그인 실패 처리', '  - 5회 실패하면 잠금 <!--@A-002-->'].join('\n')

    expect(ids(content)).toEqual(['A-002'])
  })
})

describe('주석이 여러 개 붙은 항목', () => {
  it('명세 태그만 있는 줄에 주석이 2개 붙어 있으면 명세 항목을 만들지 않는다', () => {
    expect(ids('- <!--@A-001--><!--@A-002-->')).toEqual([])
  })
})

describe('빈 항목', () => {
  it('내용 없는 리스트 항목이면 빈 목록을 반환한다', () => {
    expect(ids('-')).toEqual([])
  })
})

describe('빈 문서', () => {
  it('빈 문자열이면 빈 목록을 반환한다', () => {
    expect(ids('')).toEqual([])
  })
})
