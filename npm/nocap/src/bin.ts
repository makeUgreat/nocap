#!/usr/bin/env node
import { checkCoverage } from './index.js'
import { CoverageCheckCommand } from './presentation/cli/coverage-check.command.js'
import { CoverageCheckTextFormatter } from './presentation/cli/coverage-check.text.formatter.js'

function hasColors(stream: NodeJS.WriteStream): boolean {
  if (stream.isTTY) return stream.hasColors()
  const forceColor = process.env['FORCE_COLOR']
  return forceColor !== undefined && forceColor !== '0' && forceColor !== 'false'
}

const command = new CoverageCheckCommand(
  checkCoverage,
  new CoverageCheckTextFormatter({ stdout: hasColors(process.stdout), stderr: hasColors(process.stderr) }),
)

const output = await command.run(process.argv.slice(2))
process.stdout.write(output.stdout)
process.stderr.write(output.stderr)
process.exitCode = output.exitCode
