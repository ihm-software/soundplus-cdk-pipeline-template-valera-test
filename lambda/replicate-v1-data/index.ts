import {transform} from './util/transform';
import {EventBridgeEvent} from 'aws-lambda';
import {log, logEventData} from './util/logger';
import {Document, OperationType, RaptorJobDocument, RaptorJobScheduleDocument, UpdateDescription, EventBridgeDetail} from './util/types';
import {addOrUpdateData, deleteData} from './util/dynamoDbHelper';
import {intersection, isUndefined} from 'lodash';
import {RAPTOR_JOB_TABLE, RAPTOR_JOB_SCHEDULE_TABLE, RAPTOR_JOB_TABLE_KEYS, RAPTOR_JOB_SCHEDULE_TABLE_KEYS} from './util/consts';

export const jobDataReplicateHandler = async function (event: EventBridgeEvent<string, EventBridgeDetail>): Promise<boolean> {
    try {
        log('--- Starting Job Data Replicate lambda ---');

        const operationType: OperationType = event.detail.operationType;
        const tableName = event.detail.ns.coll;
        const updatedData: Document | undefined = event.detail.fullDocument;
        const previousData: Document | undefined = event.detail.fullDocumentBeforeChange;
        const updateDescription: UpdateDescription | undefined = event.detail.updateDescription;

        logEventData({operationType, tableName, previousData, updatedData, updateDescription});

        if (operationType === 'delete') {
            if (isUndefined(previousData)) {
                throw new Error('RaptorJob:Error:`fullDocumentBeforeChange` is required to delete the data.');
            }
            await deleteData(tableName, previousData);
        } else {
            if (isUndefined(updatedData)) {
                throw new Error('RaptorJob:Error:`fullDocument` is required to add or update the data.');
            }
            const transformedData: RaptorJobDocument | RaptorJobScheduleDocument = await transform(tableName, updatedData);

            // Case: If any of the keys gets changed in mongoDb then we need to delete the document in dynamodb as updating keys is not supported. So we will first delete the document and will add it again with updated keys
            if (!isUndefined(updateDescription) && !isUndefined(previousData)) {
                if (
                    (tableName === RAPTOR_JOB_TABLE && intersection(Object.keys(updateDescription.updatedFields), RAPTOR_JOB_TABLE_KEYS).length > 0) ||
                    (tableName === RAPTOR_JOB_SCHEDULE_TABLE &&
                        intersection(Object.keys(updateDescription.updatedFields), RAPTOR_JOB_SCHEDULE_TABLE_KEYS).length > 0)
                ) {
                    await deleteData(tableName, previousData);
                }
            }
            await addOrUpdateData(tableName, transformedData);
        }

        log('JobDataReplicateLambda:Success');
        return true;
    } catch (error) {
        log('JobDataReplicateLambda:Error: ', error as object);
        return false;
    }
};
exports.handler = jobDataReplicateHandler;
