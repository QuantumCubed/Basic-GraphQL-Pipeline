import '@dotenvx/dotenvx/config';
import express from "express";
import { readFileSync } from "fs";
import { createHandler } from "graphql-http/lib/use/express";
import { makeExecutableSchema } from "@graphql-tools/schema";
import * as dynamoUserService from "./database/services/dynamo.user-service";
import { updateUserArgs, UserArgs } from "../gQL/Types/User";
import { nUsers, QueryArgs } from "../gQL/Types/Query";
import * as claudeProcessingService from "./bot/services/nlpService";
import { graphql } from "graphql";
interface EchoArgs {
  mssg: string;
}

const resolvers = {
  Query: {
    hello: () => "Hello World!",
    getUser: async (_parent: unknown, args: QueryArgs) => {
      if (!args) {
        return null;
      }
      const result = await dynamoUserService.queryUser(args.id);
      console.log(result);
      return result;
    },
    listNUsers: async (_parent: unknown, args: nUsers) => {
      if (!args) {
        return null;
      }
      const result = await dynamoUserService.listNUsers(args.n !== undefined ? Number(args.n) : -1);
      console.log(result);
      return result;
    },
  },
  Mutation: {
    echo: (_parent: unknown, args: EchoArgs) => {
      return `You said: ${args.mssg}`;
    },
    createUser: async (_parent: unknown, args: UserArgs) => {
      if (!args) {
        return false;
      }
      const result = await dynamoUserService.addUser(args);
      if (!result) {
        return false;
      }
      console.log(result);
      return true;
    },
    updateUser: async (_parent: unknown, args: updateUserArgs) => {
      const result = await dynamoUserService.updateUser(args);
      return result;
    },
    deleteUser: async (_parent: unknown, args: QueryArgs) => {
      const result = await dynamoUserService.deleteUser(args.id);
      return result;
    },
  },
};

const typeDefs = readFileSync("../gQL/schema.gql", "utf8");
const schema = makeExecutableSchema({ typeDefs, resolvers: resolvers });

const app = express();
const port = 3000;

// VERIFY KONG HEADERS

// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.url}`);
//   console.log('Headers:', req.headers);
//   next();
// });

app.use(express.json());

app.all("/graphql", createHandler({ schema }));

app.post("/ai", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Missing Message Field In Request Body",
      });
    }

    console.log("Received message:", message);
    console.log("Calling Claude API...");
    const intent = await claudeProcessingService.parseIntent(message);
    console.log("Intent:", intent);

    console.log("Building GQL Query...");
    const gqlQuery = claudeProcessingService.buildGQLQuery(intent);
    console.log("GraphQL Query:", gqlQuery);

    console.log("Executing GQL Query...");
    const result = await graphql({
      schema,
      source: gqlQuery,
    });
    console.log("GraphQL Result:", result);

    if (result.errors) {
      return res.status(400).json({
        message: "GraphQL Execution Error!",
        errors: result.errors,
        intent,
        gqlQuery,
      });
    }

    return res.status(200).json({
      message: "Success!",
      intent,
      data: result.data,
    });
  } catch (error) {
    console.error("/AI Endpoint Error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown Error",
    });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
