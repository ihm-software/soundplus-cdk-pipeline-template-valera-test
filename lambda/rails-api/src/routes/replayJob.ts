import {Response, Request} from 'lambda-api';
import {createLogger, transports} from 'winston';
import {PatchJobAsync} from '../util/jobUtil';
import {ValidateGuid} from '../util/validator';

const logger = createLogger({
    transports: [new transports.Console()],
});

export const replayJob = async (req: Request, res: Response): Promise<void> => {
    const {context, pathParameters} = req;

    let response;

    try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore next line
        const z_cloud_org_id = req.app._event.headers['z-cloud-org-id'];
        console.log(z_cloud_org_id);

        if (ValidateGuid(z_cloud_org_id, response, 'Invalid OrganizationID Guid')) {
            return response;
        }

        logger.info(`entering ${context.functionName}`);

        const jobkey = pathParameters?.jobkey;

        //TODO ~DB: Before setting this job to 'Ready',
        //we will need to expire all other none COMPLETE or ERROR jobs in the database
        //with the SAME 'JobName', only allow one job per 'JobName' group to be set as Ready/Running at a time!

        //Patch the job back to ready!
        const job = {
            OrganizationID: z_cloud_org_id,
            JobKey: jobkey,
            JobStatus: 'Ready',
        };

        //set the job to 'Ready' - so we can run the job...
        response = await PatchJobAsync(job);
        if (response.statusCode !== 200) {
            response = {
                statusCode: response.statusCode,
                body: JSON.parse(response.body).message,
            };
        }
    } catch (err) {
        const msg = `Unable to Replay Job: ${err}`;
        logger.error(msg);

        response = {
            statusCode: 500,
            body: msg,
        };
    }

    res.send(response);
};
