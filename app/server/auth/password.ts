import bcrypt from 'bcryptjs'

const PASSWORD_SALT_ROUNDS = 12

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(PASSWORD_SALT_ROUNDS)
  return bcrypt.hash(password, salt)
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash)
}
