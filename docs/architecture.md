---
title: 아키텍처
applies_to:
  - packages/nocap/src
read_when:
  - 새 모듈이나 디렉토리를 추가할 때
  - 모듈 사이에 import를 추가할 때
related:
  - writing-guide.md
---

# 아키텍처

## 레이어
- 소스 코드는 `domain`, `application`, `infrastructure`, `presentation` 4개 레이어로 나눔
  - nocap의 변경은 대부분 바깥쪽에서 일어남. 예: 테스트 언어 추가, 실행 결과 입력, 출력 형식 추가, 명령 추가
  - 커버리지 판정 규칙은 거의 바뀌지 않음
  - 바뀌는 부분과 바뀌지 않는 부분을 나누면 입력 형식을 추가해도 판정 규칙을 고치지 않음
- `domain`은 명세 항목, 테스트 참조, 발견 사항, 커버리지 판정 규칙을 가짐
- (미구현) `application`은 유스케이스 흐름을 조립하고 포트 interface를 정의함
- (미구현) `infrastructure`는 포트를 구현함. Markdown 파싱, 테스트 코드 스캔, 파일 시스템 접근을 맡음
- (미구현) `presentation`은 CLI와 출력 포매터를 가짐
- 라이브러리 진입점은 `presentation`에 속함

## 의존성 규칙
- 바깥 레이어는 안쪽 레이어를 import할 수 있음. 안쪽 레이어는 바깥 레이어를 import하지 않음
- 바깥 레이어는 중간 레이어를 건너뛰고 더 안쪽 레이어를 import할 수 있음
  - 포트와 포매터는 `domain` 타입을 직접 씀
  - 건너뛰기를 막으면 `domain` 타입과 같은 모양의 전달용 타입과 변환 코드가 필요함

```mermaid
flowchart TD
  presentation --> infrastructure
  presentation --> application
  infrastructure --> application
  application --> domain
  infrastructure --> domain
  presentation --> domain
```

## 디렉토리 규칙
- 레이어마다 `src/` 바로 아래에 같은 이름의 디렉토리를 하나 둠
  - 예: `src/domain/`, `src/application/`, `src/infrastructure/`, `src/presentation/`
- `infrastructure` 아래에는 입력 형식이나 외부 시스템마다 디렉토리를 하나 둠
  - 예: `markdown/`, `typescript/`, `fs/`
  - 입력 형식을 추가할 때 디렉토리 하나만 추가하면 됨
- `presentation` 아래에는 `cli/`와 `format/`을 둠
  - 출력 포매터는 CLI와 라이브러리 API가 함께 씀. `cli/` 안에 두면 라이브러리 API가 CLI에 의존하게 됨
- 라이브러리 진입점은 `src/index.ts`임
  - 패키지 진입점은 관례상 `src/` 바로 아래에 둠. `presentation` 디렉토리 밖에 있지만 `presentation` 레이어로 취급함
- 디렉토리는 그 안에 들어갈 코드를 만들 때 만듦

## 런타임
- nocap은 ESM 전용으로 배포함
  - Node 22.12부터 `require(esm)`이 기본으로 켜짐. CJS 사용자도 ESM 패키지를 불러올 수 있음
  - CJS와 ESM을 함께 빌드하면 빌드 설정과 배포 파일이 두 배가 됨
- nocap이 지원하는 Node 버전은 `>=22.12`임
  - Node 20은 2026-04-30에 지원이 종료됐음[^1]
  - 개발용 테스트 러너가 Node 22.12 이상을 요구함. 선언한 지원 범위와 검증할 수 있는 범위가 같아야 함
- 최소 Node 버전을 올리는 변경은 major 버전 변경으로 다룸
  - 최소 버전을 올리면 기존 사용자 환경이 깨짐. 최소 버전을 낮추는 변경은 major 버전 변경이 아님
- Node 타입 정의의 major 버전은 최소 지원 Node의 major 버전과 같게 둠
  - 타입 정의가 더 높으면 지원하지 않는 Node API를 써도 타입 오류가 나지 않음

[^1]: Node.js Release 일정, <https://github.com/nodejs/Release>, 2026-11-02 확인
