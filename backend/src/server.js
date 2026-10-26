const { ApolloServer } = require("@apollo/server");
const { typeDefs } = require("./schema");
const { resolvers, getUserIdFromAuthHeader } = require("./resolvers");
const { createStore } = require("./store");

const store = createStore();

function createApolloServer() {
  return new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
  });
}

function buildContext(authHeader) {
  return { store, userId: getUserIdFromAuthHeader(authHeader) };
}

module.exports = { createApolloServer, buildContext };
