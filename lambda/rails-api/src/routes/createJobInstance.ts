import {Response, Request} from 'lambda-api';
import {createLogger, transports} from 'winston';
import {getJobRequestObjectForJobType, getJobKey, runJobAsync, CreateJobAsync} from '../util/jobUtil';
import {getConnection} from '../util/mongoDBHelper';
import {ValidateGuid} from '../util/validator';

const logger = createLogger({
    transports: [new transports.Console()],
});

const connPromise = getConnection();
let conn;

export const createJobInstance = async (req: Request, res: Response) => {
    const {pathParameters} = req;
    let response: any;

    try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore next line
        const z_cloud_org_id = req.app._event.headers['z-cloud-org-id'];

        if (ValidateGuid(z_cloud_org_id, response, 'Invalid OrganizationID Guid')) return response;

        //Validation
        logger.info(`GET Job: ${pathParameters?.schedulekey}`);
        if (null === pathParameters?.schedulekey) {
            const msg = 'Could not GET Job Schedule because of validation errors, valid schedulekey is required.';
            logger.error(msg);

            response = {
                statusCode: 400,
                body: msg,
            };

            res.send(response);
            return;
        }

        conn = await connPromise;

        const validateString = (scheduleKey: string | undefined) => {
            if (!scheduleKey?.length) throw new Error('Invalid scheduleKey');
            return scheduleKey;
        };

        //do some validation on jobSchedule
        const scheduleKey = validateString(pathParameters?.schedulekey);

        // read the job schedule from mongo
        const jobSchedule = await conn.collection('RaptorJobSchedule').findOne({
            OrganizationID: z_cloud_org_id,
            ScheduleKey: scheduleKey,
        });

        const validateScheduleJobData = (scheduleData: {
            StationID: string;
            IntervalType: string;
            IntervalCount: string;
            RestrictPublicationStatus: string;
            PastHours: string;
        }) => {
            validateString(scheduleData.StationID);
            validateString(scheduleData.IntervalType);
            validateString(scheduleData.IntervalCount);
            validateString(scheduleData.RestrictPublicationStatus);
            validateString(scheduleData.PastHours);
            return scheduleData;
        };

        const scheduleData = validateScheduleJobData(jobSchedule.ScheduleJobData);

        if (jobSchedule) {
            logger.info(`CREATING and RUNNING Job for Schedule, OrgID: ${jobSchedule.OrganizationID}. ScheduleKey: ${jobSchedule.ScheduleKey}`);

            // Josh - please have a look and see if we can stop Snyk complaining
            // deepcode ignore Sqli: <please specify a reason of ignoring this>
            const jobRequestData = await getJobRequestObjectForJobType(conn, scheduleData);
            if (jobRequestData !== null) {
                const jobKey = await getJobKey(jobSchedule);
                const jobObj = {
                    OrganizationID: z_cloud_org_id,
                    JobKey: jobKey,
                    JobName: jobKey,
                    JobType: jobSchedule.ScheduleJobType,
                    JobStatus: 'Created',
                    Description: 'Description will be added soon',
                    JobRequestData: jobRequestData,
                    JobCluster: process.env.JobCluster,
                    ScheduleKey: jobSchedule.ScheduleKey,
                };
                logger.info(`CREATE and RUN Job, OrgID: ${jobObj.OrganizationID}. JobKey: ${jobObj.JobKey}`);

                //Create the job and Set the job in a ready state so we can run it!
                jobObj.JobStatus = 'Ready';
                response = await CreateJobAsync(jobObj);
                if (response.statusCode === 200) {
                    response = await runJobAsync(z_cloud_org_id, jobObj.JobKey as string);
                }
                if (response.statusCode !== 200) {
                    response = {
                        statusCode: response.statusCode,
                        body: JSON.parse(response.body).message,
                    };
                }
            } else {
                const msg = `Unable to generate Job Request object for scheduled job ${pathParameters?.schedulekey} `;
                logger.error(msg);

                response = {
                    statusCode: 500,
                    body: msg,
                };
            }
        } else {
            const msg = `Cannot find job schedule for schedule key ${pathParameters?.schedulekey} in the database`;
            logger.error(msg);

            response = {
                statusCode: 404,
                body: msg,
            };
        }
    } catch (e) {
        const msg = `Unable to Run Job for the schedule: ${e}`;
        logger.error(msg);

        response = {
            statusCode: 500,
            body: msg,
        };
    }

    res.send(response);
};
