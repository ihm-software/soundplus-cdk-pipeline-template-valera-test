/** Ported from
 * https://github.com/ihm-software/soundplus-jobs-run-scheduled/blob/master/handler.js
 */

import {SSMClient} from '@aws-sdk/client-ssm';
import {SecretsManagerClient} from '@aws-sdk/client-secrets-manager';
import {DynamoDB} from '@aws-sdk/client-dynamodb';
import axios from 'axios/index';
import {getParameterStoreUtil} from '../../util/src/parameter-store';
import {getSecretsManagerUtil} from '../../util/src/secrets-manager';
import {getLogger, levels, LogLevelDesc} from 'loglevel';
import {getTokenUtil} from './TokenUtil';
import {runScheduledJob as runScheduledJob} from './runScheduledJob';
import {EventBridgeHandler} from 'aws-lambda';

const getRegion = () => {
    return process.env.AWS_REGION || 'us-east-1';
};

export const handler: EventBridgeHandler<'scheduled-job', {}, void> = async (): Promise<void> => {
    const log = getLogger('start scheduled-job');
    const level = (process.env.LOG_LEVEL as LogLevelDesc) || levels.WARN;
    log.setLevel(level);

    const region = getRegion();
    const dynamoDB = new DynamoDB({region});
    const ssmClient = new SSMClient({region});
    const smClient = new SecretsManagerClient({region});
    const parameterStoreUtil = getParameterStoreUtil(ssmClient);
    const secretsManagerUtil = getSecretsManagerUtil(smClient);
    const tokenUtil = getTokenUtil(parameterStoreUtil, secretsManagerUtil, log, axios);

    await runScheduledJob(log, dynamoDB, parameterStoreUtil, secretsManagerUtil, tokenUtil);
};
