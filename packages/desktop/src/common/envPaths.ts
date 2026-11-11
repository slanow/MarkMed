import path from 'path'

class EnvPaths {
  private readonly _electronUserDataPath: string
  private _userDataPath: string
  private _logPath: string
  private _preferencesPath: string
  private _dataCenterPath: string

  constructor(userDataPath: string, electronUserDataPath?: string) {
    const currentDate = new Date()
    if (!userDataPath) {
      throw new Error('"userDataPath" is not set.')
    }

    this._electronUserDataPath = electronUserDataPath || userDataPath
    this._userDataPath = userDataPath
    this._logPath = path.join(
      this._userDataPath,
      'logs',
      `${currentDate.getFullYear()}${currentDate.getMonth() + 1}`
    )
    this._preferencesPath = userDataPath

    this._dataCenterPath = userDataPath
  }

  retargetUserDataPath(newUserDataPath: string): void {
    if (!newUserDataPath) return
    const currentDate = new Date()
    this._userDataPath = newUserDataPath
    this._logPath = path.join(
      this._userDataPath,
      'logs',
      `${currentDate.getFullYear()}${currentDate.getMonth() + 1}`
    )
    this._preferencesPath = newUserDataPath
    this._dataCenterPath = newUserDataPath
  }

  get electronUserDataPath(): string {
    // Identical to app.getPath('userData') but userDataPath need not match.
    return this._electronUserDataPath
  }

  get userDataPath(): string {
    return this._userDataPath
  }

  get logPath(): string {
    return this._logPath
  }

  get preferencesPath(): string {
    return this._preferencesPath
  }

  get dataCenterPath(): string {
    return this._dataCenterPath
  }
}

export default EnvPaths
