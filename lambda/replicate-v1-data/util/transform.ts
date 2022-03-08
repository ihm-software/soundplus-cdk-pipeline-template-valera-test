import {log} from './logger';
import {RaptorJobDocument, RaptorJobScheduleDocument, Document} from './types';

export const transform = async (tableName: string, updatedData: Document): Promise<RaptorJobDocument | RaptorJobScheduleDocument> => {
    try {
        if (tableName.toLowerCase() === 'raptorjob') {
            return transformToJobDocument(updatedData);
        } else {
            return transformToJobScheduleDocument(updatedData);
        }
    } catch (error) {
        log(`Error while transforming Data to ${tableName} Document-> , ${error}`);
        throw new Error(error as string);
    }
};

const transformToJobDocument = (updatedData: Document): RaptorJobDocument => {
    if (updatedData['JobKey'] === undefined) {
        throw new Error('RaptorJob:TransformError:"JobKey" is required');
    }

    if (updatedData['OrganizationID'] === undefined) {
        throw new Error('RaptorJob:TransformError:"OrganizationID" is required');
    }

    const transformedData: RaptorJobDocument = {
        mongoDocRefId: '',
        OrganizationID: '',
        JobKey: '',
    };

    Object.keys(updatedData).forEach((keyName: keyof RaptorJobDocument | string) => {
        if (keyName === '_id') {
            transformedData['mongoDocRefId'] = updatedData['_id'] as string;
        } else {
            transformedData[keyName] = updatedData[keyName];
        }
    });
    return transformedData;
};

const transformToJobScheduleDocument = (updatedData: Document): RaptorJobScheduleDocument => {
    if (updatedData['ScheduleKey'] === undefined) {
        throw new Error('RaptorJobSchedule:TransformError:"ScheduleKey" is required');
    }
    if (updatedData['OrganizationID'] === undefined) {
        throw new Error('RaptorJobSchedule:TransformError:"OrganizationID" is required');
    }

    const transformedData: RaptorJobScheduleDocument = {
        mongoDocRefId: '',
        OrganizationID: '',
        ScheduleKey: '',
    };

    Object.keys(updatedData).forEach((keyName: keyof RaptorJobScheduleDocument | string) => {
        if (keyName === '_id') {
            transformedData['mongoDocRefId'] = updatedData['_id'] as string;
        } else {
            transformedData[keyName] = updatedData[keyName];
        }
    });
    return transformedData;
};
