import { useCallback, useMemo, useState } from 'react'
import { client, TOKEN_KEY } from './graphql'
import { AuthContext } from './useAuth'

const USER_KEY = 'tactlink.user'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY))
    } catch {
      return null
    }
  })

  const signIn = useCallback(({ token, user }) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setToken(token)
    setUser(user)
  }, [])

  const signOut = useCallback(async () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
    await client.clearStore() // never leak one user's cached todos to the next
  }, [])

  const value = useMemo(() => ({ token, user, signIn, signOut }), [token, user, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

