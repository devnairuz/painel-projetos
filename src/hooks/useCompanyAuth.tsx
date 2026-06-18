import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  companyLogout,
  getCompanySession,
  loginCompany,
  verifyCompany,
  resetPasswordCompany,
  type CompanyUser,
} from '@/services/companyAuthService'

interface CompanyAuthContextValue {
  user: CompanyUser | null
  login: (email: string, password: string) => Promise<void>
  verify: (email: string, code: string) => Promise<void>
  resetPassword: (email: string, code: string, password: string) => Promise<void>
  logout: () => void
}

const CompanyAuthContext = createContext<CompanyAuthContextValue | null>(null)

/** Sessão do usuário interno da Nairuz (JWT). */
export function CompanyAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CompanyUser | null>(() => getCompanySession())

  const login = useCallback(async (email: string, password: string) => {
    setUser(await loginCompany(email, password))
  }, [])

  const verify = useCallback(async (email: string, code: string) => {
    setUser(await verifyCompany(email, code))
  }, [])

  const resetPassword = useCallback(async (email: string, code: string, password: string) => {
    setUser(await resetPasswordCompany(email, code, password))
  }, [])

  const logout = useCallback(() => {
    companyLogout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, login, verify, resetPassword, logout }),
    [user, login, verify, resetPassword, logout],
  )

  return <CompanyAuthContext.Provider value={value}>{children}</CompanyAuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCompanyAuth(): CompanyAuthContextValue {
  const ctx = useContext(CompanyAuthContext)
  if (!ctx) throw new Error('useCompanyAuth deve ser usado dentro de <CompanyAuthProvider>')
  return ctx
}
