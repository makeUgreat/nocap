---
title: nocap 명세
applies_to:
  - npm/nocap/src
read_when:
  - nocap의 동작을 추가하거나 바꿀 때
related:
  - ../architecture.md
  - ../../../../docs/writing-guide.md
  - ../syntax.md
---

# nocap 명세

## 범위
- 이 디렉터리는 결정한 nocap의 동작만 담음
  - 결정하지 않은 동작을 쓰면 구현 대상과 검토 대상이 섞임
- 명세에는 nocap을 바깥에서 실행해 참과 거짓을 확인할 수 있는 동작만 씀
  - 예: "nocap은 명세 태그가 있는 리스트 항목마다 명세 항목 1개를 만듦"은 명세임
  - 예: "명세 태그는 리스트 항목 텍스트 맨 끝에 둠"은 문법임. 문법은 [nocap 문법](../syntax.md)에 씀
  - 예: "명세 파서와 커버리지 판정을 분리함"은 설계임. 설계는 [아키텍처](../architecture.md)에 씀
- nocap은 이 디렉터리의 명세 항목을 자기 테스트와 연결해 추적함
  - nocap이 자기 명세를 추적하지 못하면 다른 프로젝트의 명세도 추적하지 못함

## 작성 규칙
- 명세 항목은 [nocap 문법](../syntax.md)을 따름
- 명세 문서는 frontmatter에 `title`, `applies_to`, `read_when`을 둠
  - LLM agent는 frontmatter를 보고 작업에 필요한 명세 문서를 고름

## 문서 목록
| 파일 | 접두어 | 범위 |
|---|---|---|
| [spec-parsing.md](spec-parsing.md) | `MD` | nocap이 명세 문서에서 명세 항목을 찾는 동작 |
| [test-parsing.md](test-parsing.md) | `TP` | nocap이 테스트 파일에서 테스트 항목을 찾는 동작 |
| [coverage.md](coverage.md) | `CV` | nocap이 명세 항목과 테스트 항목을 연결해 커버 여부를 정하는 동작 |
| [coverage-check.md](coverage-check.md) | `CC` | nocap이 파일을 찾아 읽고 판정 결과를 모으는 동작 |
| [cli.md](cli.md) | `CLI` | nocap 명령의 옵션, 출력, 종료 코드 |
| [library.md](library.md) | `LIB` | nocap 패키지가 내보내는 함수의 입력, 결과, 실패 |

