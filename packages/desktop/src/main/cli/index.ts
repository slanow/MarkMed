import path from 'path'
import { app } from 'electron'
import os from 'os'
import { resolvePortableUserDataDir } from '../filesystem/hiddenDirs'
import parseArgs, { userArguments, type ParsedArgs } from './parser'
import { getPath } from '../utils'

const write = (s: string): boolean => process.stdout.write(s)
const writeLine = (s: string): boolean => write(s + '\n')

const cli = (): ParsedArgs => {
  let argv = userArguments(process.argv, !!process.defaultApp, app.getAppPath())
  if (import.meta.env.DEV) {
    // Don't pass electron development arguments to MarkMed and change user data path.
    argv = ['--user-data-dir', path.join(getPath('appData'), 'markmed-dev')]
  }

  const args = parseArgs(argv, true)
  if (args['--help']) {
    write(`Usage: markmed [commands] [path ...]

  Available commands:

        --debug                   Enable debug mode
        --safe                    Disable plugins and other user configuration
    -n, --new-window              Open a new window on second-instance
        --read-only               Open the specified files in read-only mode
        --user-data-dir           Change the user data directory
        --disable-gpu             Disable GPU hardware acceleration
        --disable-spellcheck      Disable built-in spellchecker
    -v, --verbose                 Be verbose
        --version                 Print version information
    -h, --help                    Print this help message
`)
    process.exit(0)
  }

  if (args['--version']) {
    writeLine(`MarkMed: ${MARKTEXT_VERSION_STRING}`)
    writeLine(`Node.js: ${process.versions.node}`)
    writeLine(`Electron: ${process.versions.electron}`)
    writeLine(`Chromium: ${process.versions.chrome}`)
    writeLine(`OS: ${os.type()} ${os.arch()} ${os.release()}`)
    process.exit(0)
  }

  // Check for portable mode and hidden config pointers before Bootstrap initializes `userData`.
  if (!args['--user-data-dir']) {
    const portablePath = resolvePortableUserDataDir({
      appPath: app.getAppPath(),
      defaultAppDataDir: getPath('appData')
    })
    if (portablePath) {
      args['--user-data-dir'] = portablePath
    }
  } else {
    args['--user-data-dir'] = path.resolve(args['--user-data-dir'])
  }

  return args
}

export default cli
