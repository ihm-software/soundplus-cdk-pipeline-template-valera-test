import {Logger} from 'loglevel';
import {ParameterStoreUtil} from '../../util/src/parameter-store';
import {DynamoDBExecute, getActiveJobsWithScheduleKey, getDueSchedules, setNextRunDateTimeForNewJobSchedules} from './dataRepository';
import {TokenUtil} from './TokenUtil';
import {SecretsManagerUtil} from '../../util/src/secrets-manager';
import moment from 'moment';
import {AttributeValue, ExecuteStatementCommandOutput} from '@aws-sdk/client-dynamodb';
import axios from 'axios';
import Cron from 'cron-converter';
import {unmarshall} from '@aws-sdk/util-dynamodb';

class ScheduledJobError extends Error {}

const getParameter = async (parameterStoreUtil: ParameterStoreUtil, path: string) => {
    const paramResponse = await parameterStoreUtil.getEncryptedParameter(path);
    if (paramResponse instanceof Error) throw paramResponse;
    return paramResponse;
};

const getSecret = async (secretsManagerUtil: SecretsManagerUtil, path: string) => {
    const apiKey = await secretsManagerUtil.getSecret(path);
    if (!apiKey) throw new ScheduledJobError(`Failed to load ${path} from AWS Secrets Manager`);
    return apiKey;
};

const getToken = async (tokenUtil: TokenUtil) => {
    const token = await tokenUtil.getAuthToken();
    if (!token) throw new ScheduledJobError('Failed to load Authentication token');
    return token;
};

const getExistingJobMessage = (scheduleKey: string) =>
    `There is already an active job created from the schedule with key ${scheduleKey}. A new job will not be created for the job schedule.`;

const getExistingJobResponse = (item: any) => {
    return {
        isOK: true, // should this be considered as true?
        scheduleKey: `${item.ScheduleKey}`,
        message: getExistingJobMessage(item),
    };
};

const hasExistingActiveJob = (log: Logger, item: any, jobs: ExecuteStatementCommandOutput | null) => {
    if (jobs && jobs.Items && jobs.Items.length > 0) {
        log.info(getExistingJobMessage(item.ScheduleKey));
        return true;
    }
    return false;
};

const getNextRunFromSchedule = (schedule: string) => {
    const cronInstance = new Cron({
        timezone: 'UTC',
    });
    cronInstance.fromString(schedule);
    return cronInstance.schedule().next().format();
};

const getScheduleCount = (item: any) => (item.ScheduledJobsCount ? item.ScheduledJobsCount + 1 : 1);

const updateScheduledJobSuccess = 'Successfully updated the RaptorJobSchedule entry';

const updateScheduledJob = async (log: Logger, utcNow: string, item: any, dynamoDB: DynamoDBExecute) => {
    const updateRaptorJobScheduleStatement = `UPDATE RaptorJobSchedule 
    SET LastRunDateTime = '${utcNow}'
        , NextRunDateTime = '${getNextRunFromSchedule(item.CronSchedule)}'
        , ScheduledJobsCount = ${getScheduleCount(item)}
    WHERE ScheduleKey = '${item.ScheduleKey}'
    AND OrganizationID = '${item.OrganizationID}'`;

    try {
        const updateRaptorJobSchedule = await dynamoDB.executeStatement({Statement: updateRaptorJobScheduleStatement});
        log.info(`${updateScheduledJobSuccess} \nStatement: ${updateRaptorJobScheduleStatement} \nResult: ${updateRaptorJobSchedule}`);
    } catch (unknownError: unknown) {
        log.error(`Failed to update the RaptorJobSchedule entry. \nStatement: ${updateRaptorJobScheduleStatement}`, unknownError);
    }
};

const scheduleImmediateJob = async (log: Logger, dynamoDB: DynamoDBExecute, apiUrl: string, apiKey: string, token: string, item: any, utcNow: string) => {
    try {
        /** For each schedule trigger creation of a Job, by hitting the Load Balancer
         * prepare a call to create a job instance
         */
        const jobInstanceURL = `${apiUrl}/job/schedule/jobInstance/${item.ScheduleKey}`;
        const response = await axios.post(jobInstanceURL, null, {
            headers: {
                'User-Agent': 'Request-Promise',
                'X-Api-Key': apiKey,
                'z-cloud-org-id': item.OrganizationID,
                Authorization: `${token}`,
            },
        });

        updateScheduledJob(log, utcNow, item, dynamoDB);

        log.info(`Successfully scheduled job for : ${item.ScheduleKey} | Create job instance URL: ${jobInstanceURL}.`, response.data);
    } catch (unknownError: unknown) {
        const err = unknownError as {stack: string};
        const msg = `Failed to schedule job instance for the job schedule with key ${item.ScheduleKey}. Error: ${err}`;
        log.error(msg, err, err.stack);
    }
};

export const runScheduledJob = async (
    log: Logger,
    dynamoDB: DynamoDBExecute,
    parameterStoreUtil: ParameterStoreUtil,
    secretsManagerUtil: SecretsManagerUtil,
    tokenUtil: TokenUtil
): Promise<void> => {
    try {
        const utcNow = moment().utc().format();
        const apiUrl = await getParameter(parameterStoreUtil, '/soundplus/api/url');
        const apiKey = await getSecret(secretsManagerUtil, '/soundplus/api/key');
        const token = await getToken(tokenUtil);

        await setNextRunDateTimeForNewJobSchedules(log, dynamoDB);

        const dueSchedules = await getDueSchedules(utcNow, log, dynamoDB);

        const responses = dueSchedules?.Items?.map(async (dbItem: {[key: string]: AttributeValue}) => {
            const item = unmarshall(dbItem);
            const jobs = await getActiveJobsWithScheduleKey(item.ScheduleKey, log, dynamoDB);

            return hasExistingActiveJob(log, item, jobs)
                ? getExistingJobResponse(item)
                : scheduleImmediateJob(log, dynamoDB, apiUrl, apiKey, token, item, utcNow);
        });

        responses && (await Promise.all(responses));
    } catch (err: unknown) {
        if (err instanceof ScheduledJobError) {
            const error = err as ScheduledJobError;
            log.error(error.message);
        }
        const error = err as Error;
        log.error('Error in Running JobScheduledLambda', error);
    }
};
