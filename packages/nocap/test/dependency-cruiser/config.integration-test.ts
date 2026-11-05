import { describe, expect, it } from 'vitest'
import { findViolations, importing } from './config.support.js'

// 레이어마다 import할 수 있는 레이어. docs/architecture.md#의존성-규칙
// infrastructure는 domain의 경계 타입만 import할 수 있음. 경계 타입은 아래 'domain 경계 타입'에서 확인함
// presentation에서는 api만 domain을 type-only로 import할 수 있음. 아래 'presentation → domain'에서 확인함
const allowedLayerImports: Record<string, readonly string[]> = {
  domain: [],
  application: ['domain'],
  infrastructure: ['application'],
  presentation: ['application'],
}
const layers = Object.keys(allowedLayerImports)

describe.each(Object.entries(allowedLayerImports))('%s', (from, allowed) => {
  it.each(layers.filter((to) => to !== from))('→ %s', async (to) => {
    const violations = await findViolations(importing(`src/${from}/a.ts`, `src/${to}/b.ts`))

    expect(violations.length > 0).toBe(!allowed.includes(to))
  })
})

// lib은 모든 레이어가 import할 수 있고, lib은 src의 다른 코드를 import하지 않음. docs/architecture.md#의존성-규칙
describe('lib', () => {
  it.each(layers)('%s 레이어가 lib을 import하면 위반이 아니다', async (from) => {
    const violations = await findViolations(importing(`src/${from}/a.ts`, 'src/lib/b.ts'))

    expect(violations).toEqual([])
  })

  it.each([...layers.map((layer) => `${layer}/b.ts`), 'bin.ts', 'index.ts'])('lib이 src/%s를 import하면 위반이다', async (to) => {
    const violations = await findViolations(importing('src/lib/a.ts', `src/${to}`))

    expect(violations.map((violation) => violation.rule)).toEqual(['lib-not-to-src'])
  })

  it('lib 안의 import는 위반이 아니다', async () => {
    const violations = await findViolations(importing('src/lib/a.ts', 'src/lib/b.ts'))

    expect(violations).toEqual([])
  })
})

// 아래 맥락은 위 맥락을 import할 수 있음. docs/architecture.md#맥락-디렉토리
const domainContexts = ['shared', 'spec', 'test', 'coverage']

describe.each(domainContexts)('domain/%s', (from) => {
  it.each(domainContexts.filter((to) => to !== from))('→ domain/%s', async (to) => {
    const violations = await findViolations(importing(`src/domain/${from}/a.ts`, `src/domain/${to}/b.ts`))

    expect(violations.length > 0).toBe(domainContexts.indexOf(to) > domainContexts.indexOf(from))
  })
})

const applicationContexts = ['spec', 'test', 'file', 'coverage']

describe.each(applicationContexts)('application/%s', (from) => {
  it.each(applicationContexts.filter((to) => to !== from))('→ application/%s', async (to) => {
    const violations = await findViolations(importing(`src/application/${from}/a.ts`, `src/application/${to}/b.ts`))

    expect(violations.length > 0).toBe(from !== 'coverage')
  })
})

// docs/architecture.md#의존성-규칙
describe('domain 경계 타입', () => {
  it('infrastructure가 domain의 경계 타입을 import하면 위반이 아니다', async () => {
    const violations = await findViolations(importing('src/infrastructure/markdown/a.ts', 'src/domain/spec/b.boundary.ts'))

    expect(violations).toEqual([])
  })

  it('infrastructure가 domain의 경계 타입이 아닌 파일을 import하면 위반이다', async () => {
    const violations = await findViolations(importing('src/infrastructure/markdown/a.ts', 'src/domain/spec/b.ts'))

    expect(violations.map((violation) => violation.rule)).toEqual(['infrastructure-only-to-domain-boundary'])
  })

  it('infrastructure의 단위 테스트가 domain의 경계 타입이 아닌 파일을 import하면 위반이 아니다', async () => {
    const violations = await findViolations(importing('src/infrastructure/markdown/a.test.ts', 'src/domain/spec/b.ts'))

    expect(violations).toEqual([])
  })

  it('경계 타입이 다른 맥락의 경계 타입을 import하면 위반이 아니다', async () => {
    const violations = await findViolations(importing('src/domain/spec/a.boundary.ts', 'src/domain/shared/b.boundary.ts'))

    expect(violations).toEqual([])
  })

  it('경계 타입이 domain의 경계 타입이 아닌 파일을 import하면 위반이다', async () => {
    const violations = await findViolations(importing('src/domain/spec/a.boundary.ts', 'src/domain/spec/b.ts'))

    expect(violations.map((violation) => violation.rule)).toEqual(['domain-boundary-only-to-boundary'])
  })
})

// 공개 타입은 다른 공개 타입만 import함. docs/architecture.md#의존성-규칙
describe('공개 타입', () => {
  it('공개 타입이 다른 공개 타입을 import하면 위반이 아니다', async () => {
    const violations = await findViolations(importing('src/presentation/library/a.public.ts', 'src/presentation/library/b.public.ts'))

    expect(violations).toEqual([])
  })

  it('공개 타입이 application의 결과 타입을 import하면 위반이다', async () => {
    const violations = await findViolations(importing('src/presentation/library/a.public.ts', 'src/application/coverage/b.result.ts'))

    expect(violations.map((violation) => violation.rule)).toEqual(['public-only-to-public'])
  })

  it('공개 타입이 아닌 presentation 파일이 공개 타입을 import하면 위반이 아니다', async () => {
    const violations = await findViolations(importing('src/presentation/library/a.api.ts', 'src/presentation/library/b.public.ts'))

    expect(violations).toEqual([])
  })
})

// driving adapter는 다른 driving adapter를 공개 타입으로만 씀. docs/architecture.md#디렉토리-규칙
describe('presentation 어댑터', () => {
  it('cli가 library의 공개 타입을 import하면 위반이 아니다', async () => {
    const violations = await findViolations(importing('src/presentation/cli/a.command.ts', 'src/presentation/library/b.public.ts'))

    expect(violations).toEqual([])
  })

  it('cli가 library의 공개 타입이 아닌 파일을 import하면 위반이다', async () => {
    const violations = await findViolations(importing('src/presentation/cli/a.command.ts', 'src/presentation/library/b.api.ts'))

    expect(violations.map((violation) => violation.rule)).toEqual(['presentation-adapters-only-to-public'])
  })

  it('같은 어댑터 디렉토리 안의 import는 위반이 아니다', async () => {
    const violations = await findViolations(importing('src/presentation/cli/a.command.ts', 'src/presentation/cli/b.formatter.ts'))

    expect(violations).toEqual([])
  })
})

// 어댑터 조립은 index.ts만 함. bin.ts는 라이브러리 API를 씀. docs/architecture.md#의존성-규칙
describe('presentation → domain', () => {
  const typeImporting = (from: string, to: string) => ({
    [from]: `import type { Value } from '${'../'.repeat(from.split('/').length - 2)}${to.replace(/^src\//, '').replace(/[.]ts$/, '.js')}'\nexport type Used = Value\n`,
    [to]: 'export type Value = number\n',
  })

  it('api가 domain을 type-only로 import하면 위반이 아니다', async () => {
    const violations = await findViolations(typeImporting('src/presentation/library/a.api.ts', 'src/domain/coverage/b.ts'))

    expect(violations).toEqual([])
  })

  it('api가 domain의 값을 import하면 위반이다', async () => {
    const violations = await findViolations(importing('src/presentation/library/a.api.ts', 'src/domain/coverage/b.ts'))

    expect(violations.map((violation) => violation.rule)).toEqual(['presentation-api-to-domain-type-only'])
  })

  it('api의 단위 테스트가 domain의 값을 import하면 위반이 아니다', async () => {
    const violations = await findViolations(importing('src/presentation/library/a.api.test.ts', 'src/domain/coverage/b.ts'))

    expect(violations).toEqual([])
  })

  it.each(['cli/a.command.ts', 'cli/a.formatter.ts', 'library/a.public.ts'])(
    'api가 아닌 presentation/%s가 domain을 type-only로 import하면 위반이다',
    async (from) => {
      const violations = await findViolations(typeImporting(`src/presentation/${from}`, 'src/domain/coverage/b.ts'))

      expect(violations.map((violation) => violation.rule)).toContain('presentation-only-api-to-domain')
    },
  )
})

describe('진입점', () => {
  it.each(['domain', 'application', 'infrastructure'])('bin.ts가 %s를 import하면 위반이다', async (layer) => {
    const violations = await findViolations(importing('src/bin.ts', `src/${layer}/b.ts`))

    expect(violations.map((violation) => violation.rule)).toEqual(['bin-not-to-inner-layers'])
  })

  it.each(['index.ts', 'presentation/cli/b.command.ts'])('bin.ts가 src/%s를 import하면 위반이 아니다', async (to) => {
    const violations = await findViolations(importing('src/bin.ts', `src/${to}`))

    expect(violations).toEqual([])
  })

  it('index.ts가 infrastructure를 import하면 위반이 아니다', async () => {
    const violations = await findViolations(importing('src/index.ts', 'src/infrastructure/b.ts'))

    expect(violations).toEqual([])
  })
})

describe('infrastructure 어댑터', () => {
  it('다른 어댑터 디렉토리를 import하면 위반이다', async () => {
    const violations = await findViolations(importing('src/infrastructure/markdown/a.ts', 'src/infrastructure/typescript/b.ts'))

    expect(violations.map((violation) => violation.rule)).toEqual(['infrastructure-adapters-not-to-each-other'])
  })

  it('같은 어댑터 디렉토리 안의 import는 위반이 아니다', async () => {
    const violations = await findViolations(importing('src/infrastructure/markdown/a.ts', 'src/infrastructure/markdown/b.ts'))

    expect(violations).toEqual([])
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
