import {
    addOrUpdateJob,
    addOrUpdateSchedule,
    createAndRunJob,
    createJob,
    createJobInstance,
    createSchedule,
    deleteSchedule,
    patchSchedule,
    putJob,
    putSchedule,
    replayJob,
    runJob,
} from './routes';
import {APIGatewayProxyEvent, Context} from 'aws-lambda';
import createAPI from 'lambda-api';
import middy from '@middy/core';
import ssm from '@middy/ssm';

const api = createAPI();

const debug = process.env.DEBUG === 'true' || false;

const log = (text: string, o?: object) => {
    if (debug) console.log(text, o);
};

const region = process.env.AWS_REGION;

api.post('/', createJob);
api.put('/:jobkey', putJob);
api.post('/addorupdate', addOrUpdateJob);
api.get('/replayjob/:jobkey', replayJob);
api.get('/runjob/:jobkey', runJob);
api.post('/runjob', createAndRunJob);
api.post('/schedule/jobInstance/:schedulekey', createJobInstance);
api.post('/schedule/addOrUpdateSchedule', addOrUpdateSchedule);
api.post('/schedule', createSchedule);
api.delete('/schedule/:schedulekey', deleteSchedule);
api.patch('/schedule/:schedulekey', patchSchedule);
api.put('/schedule/:schedulekey', putSchedule);

export const handler = middy(async (event: APIGatewayProxyEvent, context: Context) => {
    log('Starting lambda', {event, context});

    if (!region) throw new Error('Missing environment variable: AWS_REGION is undefined');

    try {
        return await api.run(event, context);
    } catch (e) {
        console.log(e);
        return null;
    }
}).use(
    ssm({
        fetchData: {
            CLUSTER: '/soundplus/cluster',
            CONSUL_TOKEN: '/soundplus/consul-token',
            CONSUL_URL: '/soundplus/consul-url',
            CONSUL_URI_KEY: '/soundplus/consul-uri-key',
        },
        setToEnv: true,
        awsClientOptions: {
            region: region,
        },
    })
);
