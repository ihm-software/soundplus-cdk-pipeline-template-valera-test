import {createLogger, transports} from 'winston';
import {Response, Request} from 'lambda-api';
import {generateUpdateObject, getConnection} from '../util/mongoDBHelper';
import {Db} from 'mongodb';
import {validateJSON} from '../util/validator';
import {prepareRaptorJobScheduleObject} from '../util/common';

const logger = createLogger({
    transports: [new transports.Console()],
});

const connPromise = getConnection();
let conn: Db;

export const addOrUpdateSchedule = async (req: Request, res: Response): Promise<void> => {
    const {body, context} = req;
    let response;

    try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore next line
        const z_cloud_org_id = req.app._event.headers['z-cloud-org-id'];

        let requestBody;
        if (body !== null && body !== undefined) requestBody = JSON.parse(body);

        //VERFIY: if the OrgId is passed in the body, it must match the pathParameter..
        if (requestBody.OrganizationID) {
            if (requestBody.OrganizationID !== z_cloud_org_id) {
                const msg = 'Could not Create Job schedule because of validation errors, body OrganizationID does not match active OrganizationID';
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

        //Since we are might be creating an asset we should make sure it has a proper title..
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

        logger.info(`AddOrUpdate JobSchedule, OrgID: ${requestBody.OrganizationID}. ScheduleKey: ${requestBody.ScheduleKey}`);

        conn = await connPromise;
        const raptorObj = prepareRaptorJobScheduleObject(requestBody); //Set Modified time and remove undefines..

        //---- CASE REPLACE PATCH
        //Need to do special merge patched, with Arrays that have KEYS
        const updateObject = await generateUpdateObject(raptorObj, ['OrganizationID', 'ScheduleKey']);
        logger.info(`Update Object ${JSON.stringify(updateObject.set)} - ${JSON.stringify(updateObject.push)} - ${JSON.stringify(updateObject.unset)}`);

        const patchOrInsertResponse = await conn.collection('RaptorJobSchedule').findOneAndUpdate(
            {
                ScheduleKey: raptorObj.ScheduleKey,
                OrganizationID: raptorObj.OrganizationID,
            },
            {
                ...(updateObject.set && {
                    $set: updateObject.set,
                }),
                ...(updateObject.unset && {
                    $unset: updateObject.unset,
                }),
            },
            {
                upsert: true,
                returnOriginal: false,
            }
        );

        if (patchOrInsertResponse.ok) {
            //if we created a record return the created datetime
            if (
                patchOrInsertResponse.value &&
                patchOrInsertResponse.lastErrorObject &&
                !patchOrInsertResponse.lastErrorObject.updatedExisting &&
                patchOrInsertResponse.value._id
            ) {
                //Make suer we have a job cluster
                raptorObj.CreatedDateTime = patchOrInsertResponse.value._id.getTimestamp();
                delete raptorObj._id;
            }

            response = {
                statusCode: 200,
                body: JSON.stringify(raptorObj),
            };
        } else {
            const msg = `Problem during AddOrUpdate JobSchedule, OrganizationID: ${raptorObj.OrganizationID}, ScheduleKey ${
                raptorObj.ScheduleKey
            }.\r\nResult: ${JSON.stringify(patchOrInsertResponse)}`;

            response = {
                statusCode: 400,
                body: msg,
            };

            res.send(response);
            return;
        }
    } catch (e) {
        const msg = `Unable to AddOrUpdate JobSchedule: ${e}`;
        logger.error(msg);

        response = {
            statusCode: 500,
            body: msg,
        };
    }

    res.send(response);
};
