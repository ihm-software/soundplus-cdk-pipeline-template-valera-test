import {Response, Request} from 'lambda-api';
import {createLogger, transports} from 'winston';
import {CreateJobAsync} from '../util/jobUtil';
import {ValidateGuid, validateJSON} from '../util/validator';

const logger = createLogger({
    transports: [new transports.Console()],
});

export const createAndRunJob = async (req: Request, res: Response): Promise<void> => {
    const {body} = req;
    let response: any;

    try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore next line
        const z_cloud_org_id = req.app._event.headers['z-cloud-org-id'];

        if (ValidateGuid(z_cloud_org_id, response, 'Invalid OrganizationID Guid')) return response;

        logger.info(req);

        let requestBody;
        if (body !== null && body !== undefined) requestBody = body;

        //VERFIY: if the OrgId is passed in the body, it must match the pathParameter
        if (requestBody.OrganizationID) {
            if (requestBody.OrganizationID !== z_cloud_org_id) {
                const msg = 'Could not Create job because of validation errors, body OrganizationID does not match active OrganizationID';
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
            logger.info('Incoming JSON successfully validated agaist the schema');
        } else {
            const msg = 'Incoming JSON failed to validate against the schema: ' + errors;
            logger.error(msg);
            logger.error(requestBody);

            response = {
                statusCode: 400,
                body: msg,
            };

            res.send(response);
            return;
        }

        logger.info(`CREATE and RUN Job, OrgID: ${requestBody.OrganizationID}. JobKey: ${requestBody.JobKey}`);

        //Create the job and Set the job in a ready state so we can run it!
        requestBody.JobStatus = 'Ready';
        const createJob = await CreateJobAsync(requestBody);
        if (createJob.statusCode === 200) {
            response = createJob;
        }
        if (response.statusCode !== 200) {
            response = {
                statusCode: response?.statusCode,
                body: JSON.parse(response.body).message,
            };

            res.send(response);
            return;
        }
    } catch (e) {
        const msg = `Unable to Run Job: ${e}`;
        logger.error(msg);

        response = {
            statusCode: 500,
            body: msg,
        };

        res.send(response);
    }

    res.send(response);
};
