import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, gql } from '@apollo/client';
import { AsyncStorageWrapper, persistCache } from 'apollo3-cache-persist';

// For a physical device use your machine's LAN IP or the deployed AWS URL.
export const GRAPHQL_URL = process.env.EXPO_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/';
export const TOKEN_KEY = 'tactlink.token';
export const USER_KEY = 'tactlink.user';

let token = null;
export const setAuthToken = (t) => {
  token = t;
};

const authLink = new ApolloLink((operation, forward) => {
  operation.setContext(({ headers = {} }) => ({
    headers: { ...headers, ...(token ? { authorization: `Bearer ${token}` } : {}) },
  }));
  return forward(operation);
});

/**
 * Creates the Apollo client and restores the persisted cache from AsyncStorage
 * so previously loaded to-dos are visible instantly and while offline.
 */
export async function createClient() {
  const cache = new InMemoryCache();
  await persistCache({ cache, storage: new AsyncStorageWrapper(AsyncStorage) });
  return new ApolloClient({
    link: ApolloLink.from([authLink, new HttpLink({ uri: GRAPHQL_URL })]),
    cache,
    defaultOptions: { watchQuery: { fetchPolicy: 'cache-and-network' } },
  });
}

export const SIGNUP = gql`
  mutation Signup($email: String!, $password: String!) {
    signup(email: $email, password: $password) { token user { id email } }
  }
`;
export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) { token user { id email } }
  }
`;
const TODO_FIELDS = gql`
  fragment TodoFields on Todo { id title completed createdAt updatedAt }
`;
export const TODOS = gql`
  ${TODO_FIELDS}
  query Todos { todos { ...TodoFields } }
`;
export const CREATE_TODO = gql`
  ${TODO_FIELDS}
  mutation CreateTodo($title: String!) { createTodo(title: $title) { ...TodoFields } }
`;
export const UPDATE_TODO = gql`
  ${TODO_FIELDS}
  mutation UpdateTodo($id: ID!, $title: String, $completed: Boolean) {
    updateTodo(id: $id, title: $title, completed: $completed) { ...TodoFields }
  }
`;
export const DELETE_TODO = gql`
  mutation DeleteTodo($id: ID!) { deleteTodo(id: $id) }
`;
