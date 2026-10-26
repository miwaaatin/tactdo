const { ApolloServer } = require('@apollo/server');
const { typeDefs } = require('./schema');
const { resolvers, getUserIdFromAuthHeader } = require('./resolvers');
const { createStore } = require('./store');

const store = createStore();

function createApolloServer() {
  return new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true, // keep Explorer/Sandbox usable for reviewers
  });
}

/** Builds the per-request context from an Authorization header value. */
function buildContext(authHeader) {
  return { store, userId: getUserIdFromAuthHeader(authHeader) };
}

module.exports = { createApolloServer, buildContext };
