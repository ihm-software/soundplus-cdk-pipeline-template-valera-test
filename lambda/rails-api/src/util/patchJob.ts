import {createLogger, transports} from 'winston';
import {ValidateGuid} from './validator';
import {getConnection} from './mongoDBHelper';
import {Db} from 'mongodb';

const logger = createLogger({
    transports: [new transports.Console()],
});

const connPromise = getConnection();
let conn: Db;

export const patchJob = async (orgId: string, jobKey?: string, jobStatus?: string): Promise<any> => {
    let response = {};

    conn = await connPromise;
    //Validation
    logger.info(`Entering patchJob, OrgID: ${orgId}, JobKey: ${jobKey}, JobStatus: ${jobStatus}`);
    if (ValidateGuid(orgId, response, 'Could not PATCH Job because of validation errors, Invalid OrganizationID Guid')) {
        return response;
    }

    if (!jobKey) {
        const msg = 'Could not PATCH Job because of validation errors, JobKey is required.';
        logger.error(msg);

        response = {
            statusCode: 400,
            body: msg,
        };

        return response;
    }

    if (!jobStatus) {
        const msg = 'Could not PATCH Job because of validation errors, JobStatus is required.';
        logger.error(msg);

        response = {
            statusCode: 400,
            body: msg,
        };

        return response;
    }

    const res = await conn.collection('RaptorJob').findOneAndUpdate(
        {
            JobKey: jobKey,
            OrganizationID: orgId,
        },
        {
            $set: {
                JobStatus: jobStatus,
            },
        },
        {returnOriginal: false}
    );

    if (res.ok) {
        response = {
            statusCode: 200,
            body: JSON.stringify(res.value),
        };
    } else {
        const msg = `Problem during PATCH on Job, OrganizationID: ${orgId}, JobKey ${jobKey}.\r\nResult: ${JSON.stringify(res)}`;
        response = {
            statusCode: 400,
            body: JSON.stringify(msg),
        };
    }

    return response;
};
