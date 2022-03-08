import {createLogger, transports} from 'winston';
import {ValidateGuid} from '../util/validator';
import {getConnection} from './mongoDBHelper';
import {Db} from 'mongodb';

const logger = createLogger({
    transports: [new transports.Console()],
});

const connPromise = getConnection();
let conn: Db;

export const deleteJob = async (orgId: string, jobkey: string) => {
    let response;

    conn = await connPromise;
    //Validation
    logger.info(`Entering deleteJobAsync, OrgID: ${orgId}, JobKey: ${jobkey}`);
    if (ValidateGuid(orgId, response, 'Could not DELETE Job because of validation errors, Invalid OrganizationID Guid')) {
        return response;
    }

    if (!jobkey) {
        const msg = 'Could not DELETE Job because of validation errors, JobKey is required.';
        logger.error(msg);

        response = {
            statusCode: 400,
            body: msg,
        };

        return response;
    }

    const ret = await conn.collection('RaptorJob').findOneAndDelete({OrganizationID: orgId, JobKey: jobkey});

    if (ret.value !== null) {
        ret.value.CreatedDateTime = ret.value._id.getTimestamp();
        delete ret.value._id;

        response = {
            statusCode: 200,
            body: JSON.stringify(ret.value),
        };
    } else {
        const msg = `Could not DELETE Job because OrgID: ${orgId}, JobKey: ${jobkey} was not found`;

        response = {
            statusCode: 404,
            body: msg,
        };
    }

    return response;
};
