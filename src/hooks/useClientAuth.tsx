import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ClientUser } from '@/types'
import { clientLogin, clientLogout, getClientSession } from '@/services/authService'

interface ClientAuthContextValue {
  user: ClientUser | null
  login: (email: string) => Promise<void>
  logout: () => void
}

const ClientAuthContext = createContext<ClientAuthContextValue | null>(null)

/** Provê a sessão do cliente (mock) para o portal externo. */
export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(() => getClientSession())

  const login = useCallback(async (email: string) => {
    const u = await clientLogin(email)
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    clientLogout()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])

  return <ClientAuthContext.Provider value={value}>{children}</ClientAuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useClientAuth(): ClientAuthContextValue {
  const ctx = useContext(ClientAuthContext)
  if (!ctx) throw new Error('useClientAuth deve ser usado dentro de <ClientAuthProvider>')
  return ctx
}
