import {LambdaIntegration, LambdaRestApi} from 'aws-cdk-lib/aws-apigateway';
import {Construct} from 'constructs';
import {createLambda} from 'soundplus-cdk';
import {getAbsoluteLambdaPath} from '../../lambda/util/src/getLambdaPath';
export const addResource = async (scope: Construct, gateway: LambdaRestApi) => {
    const railsApiLambda = createLambda(scope, 'rails-api', getAbsoluteLambdaPath('rails-api'));
    const addUpdate = gateway.root.addResource('addorupdate');
    addUpdate.addMethod('POST', new LambdaIntegration(railsApiLambda, {proxy: true}));

    const byJobType = gateway.root.addResource('byJobType');
    const jobType = byJobType.addResource('{jobtype}', {defaultMethodOptions: {operationName: 'jobtype'}});
    jobType.addMethod('GET', new LambdaIntegration(railsApiLambda, {proxy: true}), {
        requestParameters: {
            'method.request.querystring.jobtype': true,
        },
    });
    const countolderthan = gateway.root.addResource('countolderthan');
    countolderthan.addMethod('GET', new LambdaIntegration(railsApiLambda, {proxy: true}));

    const graphql = gateway.root.addResource('graphql');
    graphql.addMethod('POST', new LambdaIntegration(railsApiLambda, {proxy: true}));

    const jobCountbyJobType = gateway.root.addResource('jobcountbyjobtype');

    const jobTypeCount = jobCountbyJobType.addResource('{jobtype}', {defaultMethodOptions: {operationName: 'jobtype'}});
    jobTypeCount.addMethod('GET', new LambdaIntegration(railsApiLambda, {proxy: true}), {
        requestParameters: {
            'method.request.querystring.jobtype': true,
        },
    });
    const list = gateway.root.addResource('list');
    list.addMethod('DELETE', new LambdaIntegration(railsApiLambda, {proxy: true}));
    list.addMethod('POST', new LambdaIntegration(railsApiLambda, {proxy: true}));

    const olderthan = gateway.root.addResource('olderthan');
    olderthan.addMethod('DELETE', new LambdaIntegration(railsApiLambda, {proxy: true}));
    olderthan.addMethod('GET', new LambdaIntegration(railsApiLambda, {proxy: true}));

    const replayjob = gateway.root.addResource('replayjob');
    const replayjobkey = replayjob.addResource('{jobkey}', {defaultMethodOptions: {operationName: 'jobkey'}});
    replayjobkey.addMethod('GET', new LambdaIntegration(railsApiLambda, {proxy: true}), {
        requestParameters: {
            'method.request.querystring.jobkey': true,
        },
    });

    const runjob = gateway.root.addResource('runjob');
    runjob.addMethod('POST', new LambdaIntegration(railsApiLambda, {proxy: true}));
    const runjobkey = runjob.addResource('{jobkey}', {defaultMethodOptions: {operationName: 'jobkey'}});
    runjobkey.addMethod('GET', new LambdaIntegration(railsApiLambda, {proxy: true}), {
        requestParameters: {
            'method.request.querystring.jobkey': true,
        },
    });

    const schedule = gateway.root.addResource('schedule');
    schedule.addMethod('POST', new LambdaIntegration(railsApiLambda, {proxy: true}));
    const scheduleaddorupdate = schedule.addResource('addorupdate');
    scheduleaddorupdate.addMethod('POST', new LambdaIntegration(railsApiLambda, {proxy: true}));
    const schedulegraphql = schedule.addResource('graphql');
    schedulegraphql.addMethod('POST', new LambdaIntegration(railsApiLambda, {proxy: true}));

    const schedulejobinstance = schedule.addResource('jobinstance');
    const schedulekey = schedulejobinstance.addResource('{schedulekey}', {defaultMethodOptions: {operationName: 'schedulekey'}});
    schedulekey.addMethod('POST', new LambdaIntegration(railsApiLambda, {proxy: true}), {
        requestParameters: {
            'method.request.querystring.schedulekey': true,
        },
    });
    const schedulekeyroot = schedule.addResource('{schedulekey}', {defaultMethodOptions: {operationName: 'schedulekey'}});
    schedulekeyroot.addMethod('DELETE', new LambdaIntegration(railsApiLambda, {proxy: true}), {
        requestParameters: {
            'method.request.querystring.schedulekey': true,
        },
    });
    schedulekeyroot.addMethod('GET', new LambdaIntegration(railsApiLambda, {proxy: true}), {
        requestParameters: {
            'method.request.querystring.schedulekey': true,
        },
    });
    schedulekeyroot.addMethod('PATCH', new LambdaIntegration(railsApiLambda, {proxy: true}), {
        requestParameters: {
            'method.request.querystring.schedulekey': true,
        },
    });
    schedulekeyroot.addMethod('PUT', new LambdaIntegration(railsApiLambda, {proxy: true}), {
        requestParameters: {
            'method.request.querystring.schedulekey': true,
        },
    });

    const rootjobkey = gateway.root.addResource('{jobkey}', {defaultMethodOptions: {operationName: 'jobkey'}});
    rootjobkey.addMethod('DELETE', new LambdaIntegration(railsApiLambda, {proxy: true}), {
        requestParameters: {
            'method.request.querystring.jobkey': true,
        },
    });
    /* rootjobkey.addMethod('GET', new LambdaIntegration(jobFunctionsLambda, {proxy: true}), {
        requestParameters: {
            'method.request.querystring.jobkey': true,
        },
    });
    rootjobkey.addMethod('PATCH', new LambdaIntegration(jobFunctionsLambda, {proxy: true}), {
        requestParameters: {
            'method.request.querystring.jobkey': true,
        },
    });
    rootjobkey.addMethod('PUT', new LambdaIntegration(jobFunctionsLambda, {proxy: true}), {
        requestParameters: {
            'method.request.querystring.jobkey': true,
        },
    }); */
};
