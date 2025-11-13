import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { PrivateUser, updateUserArgs, UserArgs } from "../../../gQL/types/User";
import { v4 as uuidv4 } from "uuid";

const dynamoClient = new DynamoDBClient({ region: "us-east-1"} );

// USING HIGH LEVEL ABSTRACTION OF DYNAMODBCLIENT

const docClient = DynamoDBDocumentClient.from(dynamoClient);

const publicQueryExpression = "id, fName, lName";

/**
 * Creates a new user in the dynamodb
 * @param userArgs args to create the user
 * @returns PublicUser || false
 */

export const addUser = async (userArgs: UserArgs) => {
    try {
        const user: PrivateUser = { id: uuidv4(), ...userArgs.usrInfo };

        if (!user) {
            console.error("User Object Not Constructed Correctly!");
            throw TypeError;
        }

        const params = {
            TableName: "users",
            Item: user
        };
        return await docClient.send(new PutCommand(params));
    } catch (error) {
        console.error("Error:", error);
        return false;
    }
}

/**
 * Returns the given user from their ID
 * @param uuid unique identification for a user
 * @returns PublicUser || null
 */

export const queryUser = async (uuid: string) => {
    const params = {
        TableName: "users",
        Key: {
            id: uuid
        },
        ProjectionExpression: publicQueryExpression
    };

    try {
        return (await docClient.send(new GetCommand(params))).Item || null;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

/**
 * Updates a user's information based on provided arguments
 * @param updateArgs the args that should be updated
 * @returns true || false
 */

export const updateUser = async (updateArgs: updateUserArgs) => {
    try {
        const updates: string [] = [];
        const names: Record <string, string> = {};
        const values: Record <string, any> = {};

        Object.entries(updateArgs.usrInfo).forEach(([key, value]) => {
            if (value !== undefined) {
                updates.push(`#${key} = :${key}`);
                names[`#${key}`] = `${key}`;
                values[`:${key}`] = value;
            }
        });

        if (updates.length === 0) {
            return false;
        }
        
        const params = {
            TableName: "users",
            Key: {
                id: updateArgs.id
            },
            UpdateExpression: `SET ${updates.join(", ")}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
            ReturnValues: "ALL_NEW" as const
        };
        console.log(params);
        await docClient.send(new UpdateCommand(params));
        return true;

    } catch (error) {
        console.error("Error Updating User:", error);
        return false;
    }
}

/**
 * Deletes a user from the database
 * @param uuid unique identification for a user
 * @returns true || false
 */

export const deleteUser = async (uuid: string) => {
    const params = {
        TableName: "users",
        Key: {
            id: uuid
        }
    };

    try {
        await docClient.send(new DeleteCommand(params));
        return true;
    } catch (error) {
        console.error("Error deleting user:", error);
        return false;
    }
}

/**
 * List n users from the database
 * @param n the number of users to list; if n <= 0, all users will be returned
 * @returns [PublicUser] || null
 */

export const listNUsers = async (n?: number) => {
    const params: any = {
        TableName: "users",
        ProjectionExpression: publicQueryExpression
    };

    if (n && n > 0) {
        params.Limit = n;
    }

    try {
        return ((await docClient.send(new ScanCommand(params))).Items || null);
    } catch (error) {
        console.error("Error Listing Items:", error);
        return null;
    }
}