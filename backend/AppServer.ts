import express from "express";
import { readFileSync } from "fs";
import { createHandler } from "graphql-http/lib/use/express";
import { makeExecutableSchema } from "@graphql-tools/schema";
import * as dynamoUserService from "./database/services/dynamo.user-service";
import { updateUserArgs, UserArgs } from "./Types/User";
import { QueryArgs } from "./Types/Query";

interface EchoArgs {
    mssg: string;
}

const resolvers = {
    Query: {
        hello: () => "Hello World!",
        getUser: async (_parent: unknown, args: QueryArgs) => {
            if(!args) {
                return null;
            }
            const result = await dynamoUserService.queryUser(args.id);
            console.log(result);
            return result;
        }
    },
    Mutation: {
        echo: (_parent: unknown, args: EchoArgs) => {
            return `You said: ${args.mssg}`
        },
        createUser: async (_parent: unknown, args: UserArgs) => {
            if(!args) {
                return false;
            }
            const result = await dynamoUserService.addUser(args);
            if(!result) {
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
        }
    }
};

const typeDefs = readFileSync("../gQL/schema.gql", "utf8");
const schema = makeExecutableSchema({ typeDefs, resolvers: resolvers });

const app = express();
const port = 3000;

app.all(
    '/graphql',
    createHandler({ schema })
);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
