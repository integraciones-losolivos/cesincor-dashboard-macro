const messagesByCode = {
  anonymous_provider_disabled: 'El acceso anónimo no está habilitado.',
  bad_code_verifier: 'El enlace de acceso no es válido. Solicita uno nuevo.',
  bad_jwt: 'La sesión no es válida. Vuelve a iniciar sesión.',
  email_address_invalid: 'Escribe una dirección de correo válida.',
  email_exists: 'Ya existe una cuenta con este correo.',
  email_not_confirmed: 'Debes confirmar tu correo antes de ingresar.',
  email_provider_disabled: 'El acceso por correo no está disponible en este momento.',
  flow_state_expired: 'El enlace venció. Solicita uno nuevo.',
  flow_state_not_found: 'El enlace no es válido o ya fue utilizado.',
  invalid_credentials: 'El correo o la contraseña no son correctos.',
  otp_expired: 'El enlace venció o ya fue utilizado. Solicita uno nuevo.',
  over_email_send_rate_limit: 'Se enviaron varios correos recientemente. Espera unos minutos e inténtalo de nuevo.',
  over_request_rate_limit: 'Se realizaron demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  same_password: 'La nueva contraseña debe ser diferente de la contraseña anterior.',
  session_not_found: 'La sesión ya no está disponible. Solicita un enlace nuevo.',
  signup_disabled: 'La creación pública de cuentas está deshabilitada.',
  user_already_exists: 'Ya existe una cuenta con este correo.',
  user_banned: 'Tu usuario se encuentra deshabilitado. Comunícate con el administrador.',
  weak_password: 'La contraseña no cumple todos los requisitos de seguridad.',
}

const messagePatterns = [
  [/invalid login credentials/i, messagesByCode.invalid_credentials],
  [/email not confirmed/i, messagesByCode.email_not_confirmed],
  [/user.*(?:banned|disabled)/i, messagesByCode.user_banned],
  [/(?:otp|link|token).*(?:expired|invalid)|expired.*(?:otp|link|token)/i, messagesByCode.otp_expired],
  [/auth session missing|session.*not found/i, messagesByCode.session_not_found],
  [/password should be at least|weak password/i, messagesByCode.weak_password],
  [/new password should be different|same password/i, messagesByCode.same_password],
  [/rate limit|only request this after/i, messagesByCode.over_email_send_rate_limit],
  [/user already registered|already exists/i, messagesByCode.user_already_exists],
  [/invalid.*email|email.*invalid/i, messagesByCode.email_address_invalid],
]

export function authErrorMessage(error, fallback = 'No fue posible completar la solicitud. Inténtalo de nuevo.') {
  const code = String(error?.code || '').trim().toLowerCase()
  if (messagesByCode[code]) return messagesByCode[code]

  const rawMessage = String(error?.message || '').trim()
  const match = messagePatterns.find(([pattern]) => pattern.test(rawMessage))
  return match?.[1] || fallback
}
