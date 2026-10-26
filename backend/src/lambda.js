// AWS Lambda entry point (API Gateway HTTP API v2)
const { startServerAndCreateLambdaHandler, handlers } = require('@as-integrations/aws-lambda');
const { createApolloServer, buildContext } = require('./server');

exports.handler = startServerAndCreateLambdaHandler(
  createApolloServer(),
  handlers.createAPIGatewayProxyEventV2RequestHandler(),
  {
    context: async ({ event }) =>
      buildContext(event.headers?.authorization || event.headers?.Authorization),
  }
);
