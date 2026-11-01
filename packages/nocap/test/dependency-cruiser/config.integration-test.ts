import { describe, expect, it } from 'vitest'
import { findViolations, importing } from './config.support.js'

// 안쪽 레이어부터 바깥 레이어 순서. docs/architecture.md#의존성-규칙
const layers = ['domain', 'application', 'infrastructure', 'presentation']

describe.each(layers)('%s', (from) => {
  it.each(layers.filter((to) => to !== from))('→ %s', async (to) => {
    const violations = await findViolations(importing(`src/${from}/a.ts`, `src/${to}/b.ts`))

    expect(violations.length > 0).toBe(layers.indexOf(to) > layers.indexOf(from))
  })
})

describe('import 문법', () => {
  it('type-only import도 레이어 규칙 위반으로 센다', async () => {
    const violations = await findViolations({
      'src/application/b.ts': 'export interface B {}\n',
      'src/domain/a.ts': "import type { B } from '../application/b.js'\nexport type A = B\n",
    })

    expect(violations).toEqual([{ rule: 'domain-not-to-outer-layers', from: 'src/domain/a.ts', to: 'src/application/b.ts' }])
  })

  it('해석할 수 없는 import는 위반이다', async () => {
    const violations = await findViolations({
      'src/domain/a.ts': "import type { Missing } from './missing.js'\nexport type A = Missing\n",
    })

    expect(violations).toEqual([{ rule: 'not-to-unresolvable', from: 'src/domain/a.ts', to: './missing.js' }])
  })
})
