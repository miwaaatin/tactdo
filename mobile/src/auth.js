import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApolloClient } from '@apollo/client/react';
import { setAuthToken, TOKEN_KEY, USER_KEY } from './graphql';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const client = useApolloClient();
  const [state, setState] = useState({ ready: false, token: null, user: null });

  useEffect(() => {
    (async () => {
      const [[, token], [, user]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
      setAuthToken(token);
      setState({ ready: true, token, user: user ? JSON.parse(user) : null });
    })();
  }, []);

  const signIn = useCallback(async ({ token, user }) => {
    await AsyncStorage.multiSet([[TOKEN_KEY, token], [USER_KEY, JSON.stringify(user)]]);
    setAuthToken(token);
    setState({ ready: true, token, user });
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setAuthToken(null);
    await client.clearStore();
    setState({ ready: true, token: null, user: null });
  }, [client]);

  const value = useMemo(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
