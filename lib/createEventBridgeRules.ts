import {EventBus, Rule, Schedule} from 'aws-cdk-lib/aws-events';
import {LambdaFunction, SqsQueue} from 'aws-cdk-lib/aws-events-targets';
import {IFunction} from 'aws-cdk-lib/aws-lambda';
import {IQueue} from 'aws-cdk-lib/aws-sqs';
import {Construct} from 'constructs';

export const createEventBridgeRules = (
    scope: Construct,
    // gsSyncScheduleQueue: IQueue,
    // gsSyncmmediateQueue: IQueue,
    xJobScheduleQueue: IQueue,
    xJobImmediateQueue: IQueue,
    runScheduledJobLambda: IFunction
) => {
    new Rule(scope, 'runJobScheduleRule', {
        schedule: Schedule.cron({minute: '0/1', hour: '*', day: '*', month: '*', year: '*'}),
        targets: [new LambdaFunction(runScheduledJobLambda)],
    });

    const bus = new EventBus(scope, 'bus', {
        eventBusName: 'Job-V2-EventBridge',
    });
    // new Rule(scope, 'gsSyncScheduleRule', {
    //     description: 'gsSyncScheduleRule',
    //     enabled: true,
    //     eventBus: bus,
    //     eventPattern: {
    //         detailType: ['/schedule/scheduledJob'],
    //     },
    //     ruleName: 'gsSyncScheduleRule',
    //     targets: [new SqsQueue(gsSyncScheduleQueue)],
    // });
    // new Rule(scope, 'gsSyncImmediateRule', {
    //     description: 'gsSyncImmediateRule',
    //     enabled: true,
    //     eventBus: bus,
    //     eventPattern: {
    //         detailType: ['/schedule/runJob'],
    //     },
    //     ruleName: 'gsSyncImmediateRule',
    //     targets: [new SqsQueue(gsSyncmmediateQueue)],
    // });
    new Rule(scope, 'xJobScheduleRule', {
        description: 'xJobScheduleRule',
        enabled: true,
        eventBus: bus,
        eventPattern: {
            detailType: ['/ScheduleJob'],
        },
        ruleName: 'xJobScheduleRule',
        targets: [new SqsQueue(xJobScheduleQueue)],
    });
    new Rule(scope, 'xJobImmediateRule', {
        description: 'xJobImmediateRule',
        enabled: true,
        eventBus: bus,
        eventPattern: {
            detailType: ['/runJob'],
        },
        ruleName: 'xJobImmediateRule',
        targets: [new SqsQueue(xJobImmediateQueue)],
    });
};
