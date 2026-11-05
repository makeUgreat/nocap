---
title: CLI
applies_to:
  - nocap 명령의 옵션, 출력, 종료 코드
read_when:
  - CLI를 구현하거나 고칠 때
  - 출력 형식을 바꿀 때
related:
  - coverage-check.md
---

# CLI

## 옵션
- nocap은 `--spec`으로 받은 패턴으로 명세 문서를, `--test`로 받은 패턴으로 테스트 파일을 찾음. 두 옵션은 여러 번 쓸 수 있음 <!-- nocap: CLI-001 -->
- nocap은 명령을 실행한 디렉토리를 기준 디렉토리로 씀 <!-- nocap: CLI-002 -->
- nocap은 `--spec`이나 `--test`가 없으면 사용법을 stderr에 쓰고 종료 코드 2로 끝남 <!-- nocap: CLI-003 -->
- nocap은 알 수 없는 옵션이나 위치 인자가 있으면 사용법을 stderr에 쓰고 종료 코드 2로 끝남 <!-- nocap: CLI-004 -->

## 진단
- nocap은 진단 1개를 stdout에 한 줄로 씀. 형식은 `경로:줄: error[종류]: 설명`임. 예: `docs/specs/auth.md:12: error[invalid-id]: "AUTH.1" has "."; hint: use only A-Z, a-z, 0-9, "-", "_"` <!-- nocap: CLI-005 -->
- nocap은 줄이 없는 파일 오류의 진단을 `경로: error[종류]: 설명` 형식으로 씀. 예: `src/old.test.coffee: error[unsupported-extension]: ".coffee" is not a supported test file extension` <!-- nocap: CLI-006 -->
- nocap은 커버되지 않은 명세 항목마다 종류 `uncovered-spec`의 진단 1줄을 씀. 위치는 그 명세 항목의 위치이고, 설명에 ID와 명세 문장을 씀. 명세 문장이 빈 문자열이면 ID만 씀 <!-- nocap: CLI-007 -->
- nocap은 알 수 없는 ID를 가리키는 테스트 항목마다 종류 `unknown-id`의 진단 1줄을 씀. 위치는 그 테스트 항목의 위치임 <!-- nocap: CLI-008 -->
- nocap은 중복 ID를 가진 명세 항목마다 종류 `duplicate-id`의 진단 1줄을 씀. 설명에 같은 ID를 가진 다른 명세 항목의 위치를 씀 <!-- nocap: CLI-009 -->
- nocap은 ID 규칙을 어긴 틀린 태그마다 종류 `invalid-id`의 진단 1줄을 씀. 설명에 그 ID에서 처음 나온 틀린 문자를 씀 <!-- nocap: CLI-025 -->
- nocap은 ID가 누락된 틀린 태그마다 종류 `missing-id`의 진단 1줄을 씀 <!-- nocap: CLI-011 -->
- nocap은 ID가 2개 이상인 틀린 태그마다 종류 `multiple-ids`의 진단 1줄을 씀. 설명에 쉼표로 나눈 값 중 빈 값이 아닌 것들을 쓰고, 힌트에 태그 1개에는 ID를 1개만 쓴다고 씀 <!-- nocap: CLI-026 -->
- nocap은 주석 덩어리 밖의 테스트 태그마다 종류 `not-above-test-call`의 진단 1줄을 씀. 힌트에 태그를 빈 줄 없이 테스트 호출 바로 위에 쓰라고 씀 <!-- nocap: CLI-027 -->
- nocap은 코드 뒤에 붙은 `nocap:` 라인 주석마다 종류 `after-code`의 진단 1줄을 씀. 힌트에 태그를 테스트 호출 위의 자기 줄에 쓰라고 씀 <!-- nocap: CLI-028 -->
- nocap은 `nocap:`이 있는 블록 주석마다 종류 `block-comment`의 진단 1줄을 씀. 힌트에 `//` 라인 주석을 쓰라고 씀 <!-- nocap: CLI-029 -->
- nocap은 주석 덩어리 안에서 반복된 ID의 테스트 태그마다 종류 `repeated-id`의 진단 1줄을 씀. 설명에 그 ID와 같은 ID의 첫 태그가 있는 줄을 씀 <!-- nocap: CLI-030 -->
- nocap은 리스트 항목 첫 문단의 맨 끝에 있지 않은 명세 태그마다 종류 `not-at-item-end`의 진단 1줄을 씀. 힌트에 태그를 리스트 항목 첫 문단의 끝에 쓰라고 씀 <!-- nocap: CLI-031 -->
- nocap은 리스트 항목 밖의 명세 태그마다 종류 `outside-list-item`의 진단 1줄을 씀. 힌트에 태그를 리스트 항목의 끝에 쓰라고 씀 <!-- nocap: CLI-032 -->
- nocap은 명세 문장 없이 명세 태그만 있는 리스트 항목의 명세 태그마다 종류 `no-sentence`의 진단 1줄을 씀. 힌트에 태그 앞에 명세 문장을 쓰라고 씀 <!-- nocap: CLI-033 -->
- nocap은 파일 오류마다 종류 `read-error`, `unsupported-extension`, `syntax-error` 중 하나의 진단을 씀. 문법 오류는 파서 메시지마다 1줄을 씀 <!-- nocap: CLI-014 -->
- nocap은 진단을 경로의 코드 단위 순서로 쓰고, 같은 경로 안에서는 줄 순서로 씀. 줄이 없는 진단은 같은 경로의 다른 진단보다 앞에 씀 <!-- nocap: CLI-015 -->
- nocap은 설명에 사용자가 쓴 값을 큰따옴표로 감싸 씀. 값 안의 `"`와 `\`는 JSON 문자열처럼 이스케이프함 <!-- nocap: CLI-016 -->
- nocap은 설명에 들어가는 명세 문장과 오류 메시지의 줄바꿈을 공백 1개로 바꿈 <!-- nocap: CLI-017 -->

## 요약
- nocap은 요약을 stderr에 씀 <!-- nocap: CLI-018 -->
- nocap은 진단이 1개 이상이면 진단 수, 파일 수, 종류별 개수를 한 줄로 씀. 개수가 0인 종류는 쓰지 않음. 예: `9 errors in 4 files: 1 uncovered-spec, 2 duplicate-id, 2 invalid-id` <!-- nocap: CLI-019 -->
- nocap은 요약의 마지막 줄에 커버된 명세 항목 수와 전체 명세 항목 수를 씀. 예: `7 of 8 specs covered` <!-- nocap: CLI-020 -->

## 색
- nocap은 stdout과 stderr마다 따로 색 사용 여부를 정함. 터미널이면 색을 쓰고, 파이프나 파일이면 쓰지 않음. `NO_COLOR`가 있으면 쓰지 않고, `FORCE_COLOR`가 있으면 씀 <!-- nocap: CLI-021 -->
- nocap은 색을 쓸 때 앞 진단과 경로가 같은 진단의 경로를 흐린 색으로 씀 <!-- nocap: CLI-022 -->

## 종료 코드
- nocap은 커버되지 않은 명세 항목, 알 수 없는 ID, 중복 ID, 틀린 태그, 파일 오류가 하나도 없으면 종료 코드 0으로 끝남. 하나라도 있으면 종료 코드 1로 끝남 <!-- nocap: CLI-012 -->
- nocap은 실행 중 예상하지 못한 오류가 나면 stdout에 아무것도 쓰지 않고, stderr에 `nocap: internal error: 메시지`와 stack trace를 쓰고 종료 코드 2로 끝남 <!-- nocap: CLI-023 -->
- nocap은 파일을 찾지 못한 패턴이 있으면 진단과 요약을 쓰지 않고, 그 패턴마다 `nocap: no files match --spec "패턴"` 1줄을 stderr에 쓰고 종료 코드 2로 끝남. 테스트 패턴은 `--test`로 씀. 예: `nocap: no files match --spec "dcos/*.md"` <!-- nocap: CLI-024 -->
