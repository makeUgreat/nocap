---
title: 아키텍처
applies_to:
  - crates/
read_when:
  - crate를 추가하거나 crate 사이의 의존을 바꿀 때
---

# 아키텍처

## crate
- 레이어와 어댑터마다 crate 1개를 둠
- `nocap-core`는 커버리지 판정 규칙만 가짐
  - 판정 규칙은 입력 형식이나 출력 형식이 바뀌어도 바뀌지 않음. 
  - 형식을 다루는 코드가 섞이면 형식을 추가할 때 판정 규칙도 고치게 됨
