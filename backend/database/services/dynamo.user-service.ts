import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { PrivateUser, updateUserArgs, UserArgs } from "../../Types/User";
import { v4 as uuidv4 } from "uuid";

const dynamoClient = new DynamoDBClient({ region: "us-east-1"} );

// using the high level abstraction layer

const docClient = DynamoDBDocumentClient.from(dynamoClient);

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

export const queryUser = async (uuid: string) => {
    const params = {
        TableName: "users",
        Key: {
            id: uuid
        }
    };

    try {
        return (await docClient.send(new GetCommand(params))).Item || null;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

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
            return null;
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