import {log} from './logger';
import {RaptorJobDocument, RaptorJobScheduleDocument} from './types';
import {DynamoDB} from 'aws-sdk';
import {RAPTOR_JOB_TABLE} from './consts';

const apiVersion = '2012-08-10';
const docClient = new DynamoDB.DocumentClient({
    apiVersion: apiVersion,
    region: 'us-east-1',
});

export const addOrUpdateData = async (tableName: string, data: RaptorJobDocument | RaptorJobScheduleDocument): Promise<boolean> => {
    try {
        await docClient
            .put({
                TableName: tableName,
                Item: data,
            })
            .promise();

        log('Dynamodb:addOrUpdateData:success');
        return true;
    } catch (error) {
        log('Dynamodb:addOrUpdateData:Error: ', error as object);
        throw new Error('DynamoDb:addOrUpdateData:Error');
    }
};

export const deleteData = async (tableName: string, previousData: Record<string, unknown>): Promise<boolean> => {
    try {
        const key =
            tableName === RAPTOR_JOB_TABLE
                ? {
                      JobKey: previousData['JobKey'],
                      OrganizationID: previousData['OrganizationID'],
                  }
                : {
                      ScheduleKey: previousData['ScheduleKey'],
                      OrganizationID: previousData['OrganizationID'],
                  };
        await docClient
            .delete({
                TableName: tableName,
                Key: key,
            })
            .promise();

        log('Dynamodb:deleteData:success');
        return true;
    } catch (error) {
        log('Dynamodb:deleteData:Error: ', error as object);
        throw new Error('DynamoDb:deleteData:Error');
    }
};
