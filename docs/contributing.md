---
title: 기여 절차
applies_to:
  - 브랜치, PR, 병합
read_when:
  - 브랜치를 만들거나 PR을 열 때
related:
  - writing-guide.md
  - testing.md
---

# 기여 절차

## 브랜치
- 모든 변경은 PR로 `master`에 병합함. `master`에 직접 커밋하지 않음
- 브랜치 이름은 `<종류>/<짧은-이름>`으로 씀. 예: `feat/spec-parser`
  - 종류는 [PR 제목](#pr-제목)의 종류와 같음. 예: `feat`, `fix`, `docs`, `chore`

## stacked PR
- 기능 하나는 stacked PR 하나로 만듦. stack 안의 PR 하나는 리뷰할 수 있는 단계 하나임
  - 예: 명세 → 도메인 타입 → 구현과 테스트
  - 단계가 PR로 나뉘면 각 PR이 작아짐. 아래 PR이 위 PR의 전제라는 순서도 드러남
- stack은 `gh stack`으로 만들고 병합함
- 코드를 바꾸는 PR은 그 코드의 테스트를 같은 PR에 넣음
  - 테스트가 다른 PR에 있으면, 아래 PR만 병합했을 때 검증되지 않은 코드가 `master`에 들어감
- 명세는 구현보다 아래 PR에 둘 수 있음
  - 명세는 아직 구현되지 않은 동작을 정의할 수 있음

## 병합
- PR은 squash merge로 병합함. stack은 `gh stack merge --squash`로 병합함
  - `master`에서 커밋 하나가 PR 하나가 됨. 결정의 근거를 그 커밋 메시지 하나에 모을 수 있음

## PR 제목
- PR 제목은 Conventional Commits 형식으로 씀. 예: `feat: add json output`, `fix(cli): keep the pattern quotes`
  - squash merge는 PR 제목을 `master` 커밋의 제목으로 씀. 그래서 PR 제목이 곧 커밋 이력임
  - 형식이 정해져 있으면 변경 종류를 커밋 이력에서 기계적으로 읽을 수 있음
  - CI가 PR 제목의 형식과 종류를 검사함. 허용하는 종류는 `.github/workflows/pr-title.yml`에 있음
- 사용자가 쓰던 동작이 깨지는 변경은 종류 뒤에 `!`를 붙임. 예: `feat!: rename --spec to --specs`
  - CI는 변경이 동작을 깨는지 판단하지 못함. `!`는 PR 작성자만 붙일 수 있음
- [릴리스](#릴리스) 도구는 `master` 커밋 제목의 종류와 `!`로 다음 버전을 정함
  - 종류나 `!`가 틀리면 버전도 틀림. 예: `fix`로 쓴 breaking change에 `!`를 빠뜨리면 patch 버전으로 배포됨

## PR 설명
- PR 설명에는 변경 요약, 관련 명세 ID, 결정과 그 이유를 씀
  - PR 설명은 "왜 이렇게 했는가"를 찾을 때 가장 자세한 기록임

## 릴리스
- 릴리스는 release-please가 여는 Release PR을 병합해서 냄
  - release-please는 `master` 커밋 제목으로 다음 버전과 `CHANGELOG.md`를 정함. 사람은 Release PR을 병합하는 시점만 고름
- npm 배포는 CI만 함. 로컬에서 `npm publish`를 실행하지 않음
  - npm에 올린 버전은 되돌릴 수 없음. 같은 버전 번호로 다시 올릴 수도 없음
  - 로컬 `dist`에는 지워진 소스의 빌드 결과가 남을 수 있음. CI는 빈 checkout에서 빌드함
  - CI는 npm trusted publishing으로 배포함. npm 토큰을 저장하지 않음
