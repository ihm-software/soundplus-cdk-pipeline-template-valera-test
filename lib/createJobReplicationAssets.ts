import {createLambda, createDLQueue} from 'soundplus-cdk';
import {Construct} from 'constructs';
import {PolicyStatement} from 'aws-cdk-lib/aws-iam';
import {EventBus, Rule} from 'aws-cdk-lib/aws-events';
import {LambdaFunction} from 'aws-cdk-lib/aws-events-targets';
import {Fn} from 'aws-cdk-lib';
import {InfraRailsConfig} from '../bin/app';
import {getAbsoluteLambdaPath} from '../lambda/util/src/getLambdaPath';

export const createJobReplicationAssets = (scope: Construct, props: InfraRailsConfig) => {
    // create JobDataReplicate lambda for Job and JobSchedule Mongo Triggers
    const lambdaName = 'replicate-v1-data';
    const jobDataReplicateDLQ = createDLQueue(scope, lambdaName + props.env?.region, props);
    const jobDataReplicateLambda = createLambda(scope, lambdaName, getAbsoluteLambdaPath(lambdaName));
    jobDataReplicateLambda.configureAsyncInvoke({
        retryAttempts: 2,
    });
    jobDataReplicateLambda.addEnvironment('QUEUE_URL', jobDataReplicateDLQ.queueUrl);
    jobDataReplicateDLQ.grantSendMessages(jobDataReplicateLambda);
    jobDataReplicateLambda.addToRolePolicy(
        new PolicyStatement({
            actions: ['ssm:GetParameters', 'ssm:GetParametersByPath', 'sqs:SendMessage', 'sqs:GetQueueAttributes', 'sqs:GetQueueUrl'],
            resources: ['*'],
        })
    );

    new Rule(scope, 'eventbridgeJobRule', {
        eventBus: EventBus.fromEventBusName(
            scope,
            'eventbusJob',
            Fn.importValue(
                'dev-us-east-1-SoundplusMessagingStack:devuseast1SoundplusMessagingStackExportsOutputRefeventbridgeRaptorJobLambdaCF09045CAC90C6C5'
            ).toString()
        ),

        eventPattern: {
            account: [props.env?.account as string],
        },
    }).addTarget(new LambdaFunction(jobDataReplicateLambda));

    new Rule(scope, 'eventbridgeJobScheduleRule', {
        eventBus: EventBus.fromEventBusName(
            scope,
            'eventbusJobSchedule',
            Fn.importValue(
                'dev-us-east-1-SoundplusMessagingStack:devuseast1SoundplusMessagingStackExportsOutputRefeventbridgeRaptorJobScheduleCE99ED2BE4DBCEB8'
            ).toString()
        ),
        eventPattern: {
            account: [props.env?.account as string],
        },
    }).addTarget(new LambdaFunction(jobDataReplicateLambda));
};
