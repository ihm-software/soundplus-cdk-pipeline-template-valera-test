#!/usr/bin/env node
import 'source-map-support/register';
import {ApiGatewayProps} from '../lib/createJobGateway';
import {MainStack} from '../lib/main-stack';
import {MainStackProps, EnvironmentConfigMap, createWithId} from 'soundplus-cdk';
import {App} from 'aws-cdk-lib';
import {CreateEventBusProps} from '../lib/createEventBuses';

const app = new App();

const getSetting = <T>(name: string): T | undefined => {
    const setting = app.node.tryGetContext(name);
    if (setting) {
        if (setting as T) return setting;
        throw new Error(`'${name}' doesn't map to type`);
    }
    return undefined;
};

// const projectName = 'soundplus-job-refactor-infra-rails';
const projectName = 'soundplus-cdk-pipeline-template';

const buildEnvironment = {
    env: {
        account: '629908876829',
        region: 'us-east-1',
    },
};

export type InfraRailsConfig = ApiGatewayProps & CreateEventBusProps;

export type InfraRailsAppProps = MainStackProps & {environments: EnvironmentConfigMap<InfraRailsConfig>};

const branch = getSetting<string>('branch') ?? 'master';

const environments: EnvironmentConfigMap<InfraRailsConfig> = {
    dev: [
        {
            branch,
            name: 'dev-us-east-1',
            env: {
                account: '604338308175',
                region: 'us-east-1',
            },
            // securityGroup: 'sg-0f50f6d6025c41992',
            // vpc: 'vpc-0d43a7f63e8eb2fd0',
            domainName: 'api.dev.zettacloud.com',
            domainNameAliasHostedZoneId: 'Z1UJRXOUMOOFQ8',
            domainNameAliasTarget: 'd-dsr2z5snc4.execute-api.us-east-1.amazonaws.com.',
            mongoTriggerEventBuses: [
                {
                    eventBusName: 'eventbridgeRaptorV2JobLambda',
                    eventSourceName: 'aws.partner/mongodb.com/stitch.trigger/60f604c31759e96ea3241d21',
                },
                {
                    eventBusName: 'eventbridgeRaptorV2JobSchedule',
                    eventSourceName: 'aws.partner/mongodb.com/stitch.trigger/60f6050a1759e96ea324555f',
                },
                {
                    eventBusName: 'eventbridgeRaptorV2JobInsertReplace',
                    eventSourceName: 'aws.partner/mongodb.com/stitch.trigger/611edcea3b5f99c3b18f6f55',
                },
                {
                    eventBusName: 'eventbridgeRaptorV2JobScheduleInsertReplace',
                    eventSourceName: 'aws.partner/mongodb.com/stitch.trigger/611edd6c1bb61bde326899b1',
                },
            ],
        },
        // {
        //     env: {
        //         account: '604338308175',
        //         region: 'us-west-2',
        //     },
        //     securityGroup: 'sg-00f7697eae1bef37a',
        //     vpc: 'vpc-047cd01889434d65b',
        //     domainName: 'api.dev2.zettacloud.com',
        //     domainNameAliasHostedZoneId: 'Z2OJLYMUO9EFXC',
        //     domainNameAliasTarget: 'd-zxpm3krkyi.execute-api.us-west-2.amazonaws.com.',
        // },
    ],
    uat: [
        // {
        //     env: {
        //         account: '296752322645',
        //         region: 'us-east-2',
        //     },
        //     securityGroup: 'sg-020016f242a74413c',
        //     vpc: 'vpc-0abb37ed5e37c4882',
        //     domainName: 'api.staging.zettacloud.com',
        //     domainNameAliasHostedZoneId: 'ZOJJZC49E0EPZ',
        //     domainNameAliasTarget: 'd-mxmkggeqfk.execute-api.us-east-2.amazonaws.com.',
        // },
    ],
    prod: [
        // {
        //     env: {
        //         account: '935520537934',
        //         region: 'us-east-1',
        //     },
        //     securityGroup: 'sg-064ef3b4583d27c4c',
        //     vpc: 'vpc-0bbef7fe762350ad2',
        //     domainName: 'api.dev.zettacloud.com',
        //     domainNameAliasHostedZoneId: 'Z1UJRXOUMOOFQ8',
        //     domainNameAliasTarget: 'd-dsr2z5snc4.execute-api.us-east-1.amazonaws.com.',
        // },
        // {
        //     env: {
        //         account: '935520537934',
        //         region: 'us-west-2',
        //     },
        //     securityGroup: 'sg-061ae1bde267625d2',
        //     vpc: 'vpc-0406c1a98625e1a3a',
        //     domainName: 'api.dev.zettacloud.com',
        //     domainNameAliasHostedZoneId: 'Z1UJRXOUMOOFQ8',
        //     domainNameAliasTarget: 'd-dsr2z5snc4.execute-api.us-east-1.amazonaws.com.',
        // },
    ],
};

const getBuildSettings = () => {
    return {
        branch,
        environments,
        name: projectName,
        ghRepository: `ihm-software/${projectName}`,
        ...buildEnvironment,
    };
};

const buildSettings = getBuildSettings();
createWithId(MainStack, app, buildSettings.name, buildSettings);
app.synth();
