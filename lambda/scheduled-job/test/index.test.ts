//import {handler} from '../src/handler';
//import {Context, EventBridgeEvent} from 'aws-lambda';

const context = {
    callbackWaitsForEmptyEventLoop: true,
    succeed: () => {},
    fail: () => {},
    done: () => {},
    awsRequestId: 'cktbwmkbi0005k7j289w975lu',
    clientContext: undefined,
    functionName: 'RaptorJobAPI-local-createJob',
    functionVersion: '$LATEST',
    identity: undefined,
    invokedFunctionArn: 'offline_invokedFunctionArn_for_RaptorJobAPI-local-createJob',
    logGroupName: 'offline_logGroupName_for_RaptorJobAPI-local-createJob',
    logStreamName: 'offline_logStreamName_for_RaptorJobAPI-local-createJob',
    memoryLimitInMB: '320',
    getRemainingTimeInMillis: () => 1,
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
//const eventObj = (_event: EventBridgeEvent<'Scheduled Event', unknown>, _context: Context): void | Promise<void> => {};

describe('Run Scheduled Jobs', async () => {
    it('should create and run jobs for any schedules that are due', async () => {
        //await handler(eventObj, context, {});
        //expect(200).toBe(res.statusCode);
    });
});
