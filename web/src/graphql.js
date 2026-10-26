import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, gql } from '@apollo/client'

export const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/'
export const TOKEN_KEY = 'tactlink.token'

const authLink = new ApolloLink((operation, forward) => {
  const token = localStorage.getItem(TOKEN_KEY)
  operation.setContext(({ headers = {} }) => ({
    headers: { ...headers, ...(token ? { authorization: `Bearer ${token}` } : {}) },
  }))
  return forward(operation)
})

export const client = new ApolloClient({
  link: ApolloLink.from([authLink, new HttpLink({ uri: GRAPHQL_URL })]),
  cache: new InMemoryCache(),
})

export const SIGNUP = gql`
  mutation Signup($email: String!, $password: String!) {
    signup(email: $email, password: $password) { token user { id email } }
  }
`
export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) { token user { id email } }
  }
`
export const ME = gql`
  query Me { me { id email } }
`

const TODO_FIELDS = gql`
  fragment TodoFields on Todo { id title completed createdAt updatedAt }
`
export const TODOS = gql`
  ${TODO_FIELDS}
  query Todos { todos { ...TodoFields } }
`
export const CREATE_TODO = gql`
  ${TODO_FIELDS}
  mutation CreateTodo($title: String!) { createTodo(title: $title) { ...TodoFields } }
`
export const UPDATE_TODO = gql`
  ${TODO_FIELDS}
  mutation UpdateTodo($id: ID!, $title: String, $completed: Boolean) {
    updateTodo(id: $id, title: $title, completed: $completed) { ...TodoFields }
  }
`
export const DELETE_TODO = gql`
  mutation DeleteTodo($id: ID!) { deleteTodo(id: $id) }
`
