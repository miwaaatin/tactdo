import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ApolloProvider } from '@apollo/client/react';
import { createClient } from './src/graphql';
import { AuthProvider, useAuth } from './src/auth';
import LoginScreen from './src/screens/LoginScreen';
import TodosScreen from './src/screens/TodosScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.brandLight, text: colors.text },
};

const Splash = () => (
  <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
    <ActivityIndicator color={colors.brandLight} />
  </View>
);

function RootNavigator() {
  const { ready, token } = useAuth();
  if (!ready) return <Splash />;
  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false, headerTitleStyle: { fontWeight: '700' } }}>
      {token ? (
        <Stack.Screen name="Todos" component={TodosScreen} options={{ title: 'My tasks' }} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [client, setClient] = useState(null);

  useEffect(() => {
    createClient().then(setClient);
  }, []);

  if (!client) return <Splash />;

  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ApolloProvider>
  );
}
