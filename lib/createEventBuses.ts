import {EventBus, Rule} from 'aws-cdk-lib/aws-events';
import {LambdaFunction} from 'aws-cdk-lib/aws-events-targets';
import {PolicyStatement, ServicePrincipal} from 'aws-cdk-lib/aws-iam';
import {Construct} from 'constructs';
import {BranchedProps, createWithId} from 'soundplus-cdk';
import {createLambda} from 'soundplus-cdk';
import {getAbsoluteLambdaPath} from '../lambda/util/src/getLambdaPath';

export type CreateEventBusProps = BranchedProps & {mongoTriggerEventBuses: MongoTrigger[]};

export type MongoTrigger = {
    eventBusName: string;
    eventSourceName: string;
};

export const createEventBuses = (scope: Construct, props: CreateEventBusProps) => {
    const lambdas: string[] = [];
    const eventBuses = props.mongoTriggerEventBuses.map(x => x);
    props.mongoTriggerEventBuses.forEach(busProp => {
        const {eventBusName, eventSourceName} = busProp;

        const bus = createWithId(EventBus, scope, eventBusName + 'JobDataReplicate', props, {
            eventSourceName,
        });

        const lambdaHandler = createLambda(scope, eventBusName, getAbsoluteLambdaPath(eventBusName));
        lambdaHandler.addToRolePolicy(
            new PolicyStatement({
                actions: ['ssm:GetParameters', 'ssm:GetParametersByPath', 'sqs:SendMessage', 'sqs:GetQueueAttributes', 'sqs:GetQueueUrl'],
                resources: ['*'],
            })
        );
        lambdas.push(lambdaHandler.functionName);
        const rule = createWithId(Rule, scope, 'JobDataReplicate' + `${eventBusName}-rule`, props, {
            description: eventBusName + 'JobDataReplicate',
            enabled: true,
            eventBus: bus,
            eventPattern: {
                account: [props.env?.account],
            },
            ruleName: eventBusName + 'JobDataReplicate',
            targets: [new LambdaFunction(lambdaHandler)],
        });

        lambdaHandler.grantInvoke(
            new ServicePrincipal('events.amazonaws.com', {
                conditions: {
                    ArnLike: {
                        'aws:SourceArn': rule.ruleArn,
                    },
                },
            })
        );
    });

    const envRegion = props.env?.region;
    return {envRegion, lambdas, eventBuses};
};
