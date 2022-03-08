import {Response, Request} from 'lambda-api';
import {createLogger, transports} from 'winston';
import {runJobAsync} from '../util/jobUtil';
import {ValidateGuid} from '../util/validator';

const logger = createLogger({
    transports: [new transports.Console()],
});

export const runJob = async (req: Request, res: Response): Promise<void> => {
    const {pathParameters} = req;
    let response;

    try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore next line
        const z_cloud_org_id = req.app._event.headers['z-cloud-org-id'];

        if (ValidateGuid(z_cloud_org_id, response, 'Invalid OrganizationID Guid')) return response;

        const jobKey = pathParameters?.jobkey;
        response = await runJobAsync(z_cloud_org_id, jobKey as string);
    } catch (e) {
        const msg = `Unable to Run Job: ${e}`;
        logger.error(msg);

        response = {
            statusCode: 500,
            body: msg,
        };
    }

    res.send(response);
};
