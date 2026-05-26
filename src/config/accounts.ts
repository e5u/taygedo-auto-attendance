export interface TaygedoAccount {
  id: string
  name: string
  uid: string
  deviceId: string
  refreshToken: string
  accessToken?: string
  laohuToken?: string
  laohuUserId?: string
  tokenUpdatedAt?: string
  phone?: string
  roleId?: string
  roleName?: string
}

export function parseAccountsSecret(secret: string): TaygedoAccount[] {
  const parsed = JSON.parse(secret) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error('TAYGEDO_ACCOUNTS must be a JSON array')
  }

  const ids = new Set<string>()
  return parsed.map((account, index) => {
    if (!isRecord(account)) {
      throw new Error(`Account at index ${index} must be an object`)
    }

    const id = requireString(account, 'id', index)
    if (ids.has(id)) {
      throw new Error(`Duplicate account id: ${id}`)
    }
    ids.add(id)

    const parsedAccount: TaygedoAccount = {
      id,
      name: requireString(account, 'name', index, id),
      uid: requireString(account, 'uid', index, id),
      deviceId: requireString(account, 'deviceId', index, id),
      refreshToken: requireString(account, 'refreshToken', index, id),
    }

    assignOptionalString(parsedAccount, account, 'accessToken')
    assignOptionalString(parsedAccount, account, 'laohuToken')
    assignOptionalString(parsedAccount, account, 'laohuUserId')
    assignOptionalString(parsedAccount, account, 'tokenUpdatedAt')
    assignOptionalString(parsedAccount, account, 'phone')

    const roleId = optionalString(account, 'roleId')
    const roleName = optionalString(account, 'roleName')
    if (roleId) {
      parsedAccount.roleId = roleId
    }
    if (roleName) {
      parsedAccount.roleName = roleName
    }

    return parsedAccount
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(
  account: Record<string, unknown>,
  field: keyof TaygedoAccount,
  index: number,
  id = String(account.id ?? index),
): string {
  const value = account[field]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Account ${id} is missing required field ${field}`)
  }
  return value
}

function optionalString(account: Record<string, unknown>, field: keyof TaygedoAccount): string | undefined {
  const value = account[field]
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Optional field ${field} must be a non-empty string when provided`)
  }
  return value
}

function assignOptionalString(
  parsedAccount: TaygedoAccount,
  account: Record<string, unknown>,
  field: keyof TaygedoAccount,
): void {
  const value = optionalString(account, field)
  if (value) {
    parsedAccount[field] = value
  }
}
