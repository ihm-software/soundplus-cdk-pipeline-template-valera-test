import {createLambda} from 'soundplus-cdk';
import {createJobGateway} from './createJobGateway';
// import {createLoadBalancing} from './createLoadBalancing';
import {createJobReplicationAssets} from './createJobReplicationAssets';
import {Stack} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Rule, Schedule} from 'aws-cdk-lib/aws-events';
import {LambdaFunction} from 'aws-cdk-lib/aws-events-targets';
import {InfraRailsConfig} from '../bin/app';
import {getAbsoluteLambdaPath} from '../lambda/util/src/getLambdaPath';
export class JobRefactorStack extends Stack {
    constructor(scope: Construct, id: string, props: InfraRailsConfig) {
        super(scope, id, props);

        const createDynamoDB = () => {};

        createDynamoDB();

        const jobRunScheduledLambda = createLambda(this, 'scheduled-job', getAbsoluteLambdaPath('scheduled-job'));

        new Rule(this, 'scheduled-job-rule', {
            schedule: Schedule.cron({minute: '0/1', hour: '*', day: '*', month: '*', year: '*'}),
            targets: [new LambdaFunction(jobRunScheduledLambda)],
        });

        // createLoadBalancing(this, props);

        const railsApiLambda = createLambda(this, 'rails-api', getAbsoluteLambdaPath('rails-api'));

        createJobGateway(this, railsApiLambda, props);

        createJobReplicationAssets(this, props);

        // Create pipeline per job including the below (rules + queues + lambda)

        // const xJobScheduleQueues = createQueuePair(this, 'x-job-schedule-publisher' + props.env?.region, props);
        // const xJobImmediateQueues = createQueuePair(this, 'x-job-immediate-publisher' + props.env?.region, props);
        // const gsSyncScheduleQueues = createQueuePair(this, 'x-gs-sync-schedule' + props.env?.region, props);
        // const gsSyncmmediateQueues = createQueuePair(this, 'x-gs-sync-immediate' + props.env?.region, props);

        // runScheduledJobLambda.addEnvironment('QUEUE_URL', xJobScheduleQueues.queue.queueUrl);
        // runScheduledJobLambda.addEnvironment('QUEUE_URL', xJobImmediateQueues.queue.queueUrl);

        // xJobScheduleQueues.queue.grantSendMessages(runScheduledJobLambda);
        // xJobImmediateQueues.queue.grantSendMessages(runScheduledJobLambda);

        // what is this for?
        // createQueueLambda(this, 'x-job-schedule', xJobScheduleQueues)
        //     .addEnvironment('QUEUE_URL', xJobScheduleQueues.queue.queueUrl)
        //     .addToRolePolicy(
        //         new PolicyStatement({
        //             actions: ['ssm:GetParameters', 'ssm:GetParametersByPath', 'sqs:SendMessage', 'sqs:GetQueueAttributes', 'sqs:GetQueueUrl'],
        //             resources: ['*'],
        //         })
        //     );

        // createQueueLambda(this, 'x-job-schedule-dl-processor', {queue: xJobScheduleQueues.queue, deadLetter: undefined})
        //     .addEnvironment('QUEUE_URL', xJobScheduleQueues.queue.queueUrl)
        //     .addToRolePolicy(
        //         new PolicyStatement({
        //             actions: ['ssm:GetParameters', 'ssm:GetParametersByPath', 'sqs:SendMessage', 'sqs:GetQueueAttributes', 'sqs:GetQueueUrl'],
        //             resources: ['*'],
        //         })
        //     );
        // ------- what is this for? //

        // createEventBridgeRules(
        //     this,
        //     // gsSyncScheduleQueues.queue,
        //     // gsSyncmmediateQueues.queue,
        //     // xJobScheduleQueues.queue,
        //     // xJobImmediateQueues.queue,
        //     runScheduledJobLambda
        // );
    }
}
