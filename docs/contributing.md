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
  - 종류는 커밋 메시지 접두어와 같음. 예: `feat`, `fix`, `docs`, `chore`

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

## PR 설명
- PR 설명에는 변경 요약, 관련 명세 ID, 결정과 그 이유를 씀
  - PR 설명은 "왜 이렇게 했는가"를 찾을 때 가장 자세한 기록임
