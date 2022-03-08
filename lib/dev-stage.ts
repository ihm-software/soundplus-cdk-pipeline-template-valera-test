import {Stage} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {JobRefactorStack} from './job-refactor-stack';
import {createWithId} from 'soundplus-cdk';
import {InfraRailsConfig} from '../bin/app';

export class DevStage extends Stage {
    constructor(scope: Construct, id: string, props: InfraRailsConfig) {
        super(scope, id, props);

        createWithId(JobRefactorStack, this, 'JobRefactorStack', props);
    }
}
