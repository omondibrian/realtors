// npm install @apollo/server express graphql cors body-parser
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { json } from "body-parser";
import cors from "cors";
import express from "express";
import { applyMiddleware } from "graphql-middleware";
import { graphqlUploadExpress } from "graphql-upload-ts";
import http from "http";
import jwt from "jsonwebtoken";
import { resolvers, typeDefs } from "./schema";
import { permissions } from "./utils/permissions";

export interface MyContext {
  isTokenValid?: boolean;
  UserId?: string;
}

async function startApolloServer() {
  const app = express();

  const schemaWithPermissions = applyMiddleware(
    makeExecutableSchema({
      typeDefs,
      resolvers,
    }),
    permissions
  );

  const httpServer = http.createServer(app);
  const server = new ApolloServer<MyContext>({
    schema:  makeExecutableSchema({
      typeDefs,
      resolvers,
    }),
    csrfPrevention: false,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await server.start();
  app.use(
    graphqlUploadExpress({
      maxFileSize: 1 * 1024 * 1024,
      maxFiles: 10,
    })
  );
  app.use(
    "/graphql",
    cors<cors.CorsRequest>(),
    json(),
    expressMiddleware(server, {
      context: async ({ req ,res}) => {
        let userId = null;
        let isTokenValid =  true

        if (req.headers["authorization"]) {
          const token = req.headers["authorization"].split(" ").pop();
          try {
            const verifiedToken: any = jwt.verify(
              token!,
              process.env.SECREATE_TOKEN as string
            );
            userId = verifiedToken._id as string;
          } catch (error) {
            // console.log(error)
            isTokenValid=false;
            // res.status(400).send("Invalid Token");
            userId !== null;
          }
        }
        // console.log(req.headers)
        return { isTokenValid, UserId: userId };
      },
    })
  );
  await new Promise<void>((resolve) =>
    httpServer.listen({ port: 4000 }, resolve)
  );
  console.log(`🚀 Server ready at http://localhost:4000/graphql`);
}

startApolloServer();
