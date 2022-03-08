import {createLogger, transports} from 'winston';
import {Response, Request} from 'lambda-api';
import {getConnection} from '../util/mongoDBHelper';
import {Db} from 'mongodb';
import {ValidateGuid, validateJSON} from '../util/validator';
import {prepareRaptorJobScheduleObject} from '../util/common';

const logger = createLogger({
    transports: [new transports.Console()],
});

const connPromise = getConnection();
let conn: Db;

export const createSchedule = async (req: Request, res: Response): Promise<void> => {
    const {body, context} = req;
    let response;

    try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore next line
        const z_cloud_org_id = req.app._event.headers['z-cloud-org-id'];
        if (ValidateGuid(z_cloud_org_id as string, response, 'Invalid OrganizationID Guid')) return response;

        logger.info(req);

        let requestBody;
        if (body !== null && body !== undefined) {
            requestBody = body;
        }

        //VERFIY: if the OrgId is passed in the body, it must match the pathParameter..
        if (requestBody.OrganizationID) {
            if (requestBody.OrganizationID !== z_cloud_org_id) {
                const msg = 'Could not Create Job Schedule because of validation errors, body OrganizationID does not match active OrganizationID';
                logger.error(msg);

                response = {
                    statusCode: 400,
                    body: msg,
                };

                res.send(response);
                return;
            }
        } else {
            //Did not pass in the OrganizationID, set it from the path parameter
            requestBody.OrganizationID = z_cloud_org_id;
        }

        logger.info(requestBody);

        const errors = await validateJSON('RaptorJobSchedule', requestBody, ['OrganizationID', 'ScheduleKey']);
        if (errors === '') {
            logger.info('Incoming JSON successfully validated against the schema.');
        } else {
            const msg = `${context.functionName}: Incoming JSON failed to validate against the schema: ` + errors;
            logger.error(msg);
            logger.error(requestBody); //log the schema being passed in

            response = {
                statusCode: 400,
                body: msg,
            };

            res.send(response);
            return;
        }

        logger.info(`CREATE JobSchedule, OrgID: ${requestBody.OrganizationID}. ScheduleKey: ${requestBody.ScheduleKey}`);

        conn = await connPromise;

        const raptorObj = prepareRaptorJobScheduleObject(requestBody); //Set Modified time and remove undefines..

        const inserted = await conn.collection('RaptorJobSchedule').insertOne(raptorObj);

        if (inserted.insertedCount === 1) {
            raptorObj.CreatedDateTime = raptorObj._id.getTimestamp();
            delete raptorObj._id;

            response = {
                statusCode: 200,
                body: JSON.stringify(raptorObj),
            };
        } else {
            const msg = `Could not CREATE JobSchedule during database operation, ScheduleKey ${raptorObj}`;
            logger.error(msg);

            response = {
                statusCode: 400,
                body: msg,
            };

            res.send(response);
            return;
        }
    } catch (e) {
        const msg = `Unable to CREATE JobSchedule: ${e}`;
        logger.error(msg);

        response = {
            statusCode: 500,
            body: msg,
        };
    }

    res.send(response);
};
