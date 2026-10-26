// Local development entry point (standalone HTTP server)
const { startStandaloneServer } = require('@apollo/server/standalone');
const { createApolloServer, buildContext } = require('./server');

const port = Number(process.env.PORT) || 4000;

(async () => {
  const server = createApolloServer();
  const { url } = await startStandaloneServer(server, {
    listen: { port, host: '0.0.0.0' }, // 0.0.0.0 so the mobile app on LAN can reach it
    context: async ({ req }) => buildContext(req.headers.authorization),
  });
  console.log(`🚀 GraphQL server ready at ${url}`);
})();
