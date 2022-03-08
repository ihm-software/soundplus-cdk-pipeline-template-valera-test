import {createLogger, transports} from 'winston';
import {Response, Request} from 'lambda-api';
import {getConnection} from '../util/mongoDBHelper';
import {Db} from 'mongodb';
import {ValidateGuid} from '../util/validator';

const logger = createLogger({
    transports: [new transports.Console()],
});

const connPromise = getConnection();
let conn: Db;

export const deleteSchedule = async (req: Request, res: Response): Promise<void> => {
    const {pathParameters} = req;
    let response;

    try {
        conn = await connPromise;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore next line
        const z_cloud_org_id = req.app._event.headers['z-cloud-org-id'];

        if (ValidateGuid(z_cloud_org_id, response, 'Could not DELETE Job because of validation errors, Invalid OrganizationID Guid')) return response;

        const scheduleKey = pathParameters?.schedulekey;
        if (!scheduleKey) {
            const msg = 'Could not DELETE JobSchedule because of validation errors, ScheduleKey is required.';
            logger.error(msg);

            response = {
                statusCode: 400,
                body: msg,
            };

            res.send(response);
            return;
        }

        const ret = await conn.collection('RaptorJobSchedule').findOneAndDelete({
            OrganizationID: z_cloud_org_id,
            ScheduleKey: scheduleKey,
        });

        if (ret.value !== null) {
            ret.value.CreatedDateTime = ret.value._id.getTimestamp();
            delete ret.value._id;

            response = {
                statusCode: 200,
                body: JSON.stringify(ret.value),
            };
        } else {
            const msg = `Could not DELETE Job because OrgID: ${z_cloud_org_id}, ScheduleKey: ${scheduleKey} was not found`;

            response = {
                statusCode: 404,
                body: msg,
            };

            res.send(response);
            return;
        }
    } catch (e) {
        const msg = `Unable to DELETE Job: ${e}`;
        logger.error(msg);

        response = {
            statusCode: 500,
            body: msg,
        };
    }

    res.send(response);
};
