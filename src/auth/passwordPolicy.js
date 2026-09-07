export const PASSWORD_MIN_LENGTH = 8

export const passwordRules = [
  {
    id: 'length',
    label: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'lowercase',
    label: 'Una letra minúscula',
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: 'uppercase',
    label: 'Una letra mayúscula',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'number',
    label: 'Un número',
    test: (password) => /\d/.test(password),
  },
  {
    id: 'symbol',
    label: 'Un símbolo',
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
]

export function passwordRuleResults(password) {
  return passwordRules.map((rule) => ({ ...rule, valid: rule.test(password) }))
}

export function isStrongPassword(password) {
  return passwordRules.every((rule) => rule.test(password))
}
