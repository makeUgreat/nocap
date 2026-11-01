import type { SpecItem } from '../domain/spec-item.js'

export interface SpecDocumentParser {
  /**
   * 명세 문서 1개의 내용에서 명세 항목을 찾는다.
   * 명세 항목은 문서에 나온 순서대로 반환한다. 명세 항목이 없으면 빈 배열을 반환한다.
   */
  parse(content: string): SpecItem[]
}
