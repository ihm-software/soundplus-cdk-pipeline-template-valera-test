import {Construct} from 'constructs';
import {DevStage} from './dev-stage';
import {UatStage} from './uat-stage';
import {ProdStage} from './prod-stage';
import {createPipeline, createWithId, EnvironmentType} from 'soundplus-cdk';
import {SnsTopic} from 'aws-cdk-lib/aws-events-targets';
import {Stack} from 'aws-cdk-lib';
import {ManualApprovalStep} from 'aws-cdk-lib/pipelines';
import {Topic} from 'aws-cdk-lib/aws-sns';
import {InfraRailsAppProps} from '../bin/app';

export class MainStack extends Stack {
    constructor(scope: Construct, id: string, props: InfraRailsAppProps) {
        super(scope, id, props);

        const pipeline = createPipeline(this, id, {branch: props.branch, ghRepository: props.ghRepository});

        const devEnvironments = props.environments[EnvironmentType.Dev];
        const dev = pipeline.addWave('dev');
        devEnvironments.forEach(environment => {
            dev.addStage(createWithId(DevStage, this, environment.name, {...environment, ...{branch: props.branch}}));
        });

        const staging = pipeline.addWave('uat');
        const stagingEnvironment = props.environments[EnvironmentType.Uat];
        stagingEnvironment.forEach(environment => {
            const stage = createWithId(UatStage, this, environment.name, {...environment, ...{branch: props.branch}});
            staging.addStage(stage).addPre(new ManualApprovalStep('Release_To_Uat', {comment: 'Are you sure you want to release to Uat?'}));
        });

        const prod = pipeline.addWave('prod');
        const prodEnvironment = props.environments[EnvironmentType.Prod];
        prodEnvironment.forEach(environment => {
            const stage = createWithId(ProdStage, this, environment.name, {...environment, ...{branch: props.branch}});
            prod.addStage(stage).addPre(new ManualApprovalStep('Release_To_Prod', {comment: 'Are you sure you want to release to Production?'}));
        });

        pipeline.buildPipeline();

        const topic = createWithId(Topic, this, 'soundplus-jobs-gssync', props);
        const target = new SnsTopic(topic);
        pipeline.pipeline.onStateChange('soundplus-jobs-gssync-event').addTarget(target);
    }
}
