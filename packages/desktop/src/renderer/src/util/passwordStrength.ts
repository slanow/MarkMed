export type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong'

export interface PasswordStrengthResult {
  level: PasswordStrengthLevel
  percent: number
  color: string
  labelKey: string
  hintKey: string
}

/**
 * Evaluates backup encryption password strength purely for advisory UI feedback.
 * Weak passwords must never block creating a backup.
 */
export const evaluatePasswordStrength = (password: string): PasswordStrengthResult => {
  const length = password.length
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasDigit = /\d/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)
  const classCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length

  let score = 0
  if (length >= 6) score += 1
  if (length >= 10) score += 1
  if (length >= 14) score += 1
  if (classCount >= 2) score += 1
  if (classCount >= 3) score += 1
  if (classCount === 4) score += 1

  // Penalize repetitive runs like "aaaaaaa" or short single-class passwords.
  if (/(.)\1{3,}/.test(password)) {
    score = Math.max(0, score - 1)
  }

  let level: PasswordStrengthLevel
  if (length < 6 || score <= 1) {
    level = 'weak'
  } else if (score <= 3) {
    level = 'fair'
  } else if (score === 4) {
    level = 'good'
  } else {
    level = 'strong'
  }

  const meta: Record<PasswordStrengthLevel, { percent: number; color: string; hintKey: string }> = {
    weak: {
      percent: 25,
      color: '#e5534b',
      hintKey: 'backup.passwordStrength.hintWeak'
    },
    fair: {
      percent: 50,
      color: '#d29922',
      hintKey: 'backup.passwordStrength.hintFair'
    },
    good: {
      percent: 75,
      color: '#4ea1ff',
      hintKey: 'backup.passwordStrength.hintGood'
    },
    strong: {
      percent: 100,
      color: '#3fb950',
      hintKey: 'backup.passwordStrength.hintStrong'
    }
  }

  return {
    level,
    percent: meta[level].percent,
    color: meta[level].color,
    labelKey: `backup.passwordStrength.${level}`,
    hintKey: meta[level].hintKey
  }
}
