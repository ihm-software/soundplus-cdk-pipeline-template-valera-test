import {Response, Request} from 'lambda-api';
import {createLogger, transports} from 'winston';
import {PutJobAsync} from '../util/jobUtil';
import {ValidateGuid, validateJSON} from '../util/validator';

const logger = createLogger({
    transports: [new transports.Console()],
});

export const putJob = async (req: Request, res: Response): Promise<void> => {
    const {body, pathParameters} = req;
    let response;

    console.log(pathParameters);

    try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore next line
        const z_cloud_org_id = req.app._event.headers['z-cloud-org-id'];

        if (ValidateGuid(z_cloud_org_id, response, 'Invalid OrganizationID Guid')) return response;

        let requestBody = req;
        if (body !== null && body !== undefined) requestBody = body;

        //VERIFY: Job - Verify Path Parameter matchs, body JobKey
        if (requestBody.JobKey !== pathParameters?.jobkey) {
            const msg = 'Could not PUT job because of validation errors, body JobKey does not match path parameter jobkey';
            logger.error(msg);

            response = {
                statusCode: 400,
                body: msg,
            };

            res.send(response);
            return;
        }

        //VERFIY: if the OrgId is passed in the body, it must match the pathParameter..
        if (requestBody.OrganizationID) {
            if (requestBody.OrganizationID !== z_cloud_org_id) {
                const msg = 'Could not PATCH job because of validation errors, body OrganizationID does not match active OrganizationID';
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

        const errors = await validateJSON('RaptorJob', requestBody, ['OrganizationID', 'JobKey']);
        if (errors === '') {
            logger.info('Incoming JSON successfully validated against the schema.');
        } else {
            const msg = 'Incoming JSON failed to validate against the schema: ' + errors;
            logger.error(msg);
            logger.error(requestBody); //log the schema being passed in

            response = {
                statusCode: 400,
                body: msg,
            };

            res.send(response);
            return;
        }

        logger.info(`PUT Job, OrgID: ${requestBody.OrganizationID}, JobKey: ${requestBody.JobKey}`);

        response = await PutJobAsync(requestBody);
    } catch (e) {
        const msg = `Unable to PUT Job: ${e}`;
        logger.error(msg);

        response = {
            statusCode: 500,
            body: msg,
        };

        res.send(response);
    }

    res.send(response);
};
