import axios from 'axios';
import {MongoClient, ObjectID, Db} from 'mongodb';
import {createLogger, transports} from 'winston';
import {ConsulResponse} from './Utils';
import url from 'url';

const logger = createLogger({
    transports: [new transports.Console()],
});

const consul_token = process.env.CONSUL_TOKEN;
const consul_url = process.env.CONSUL_URL;

let mongoDbConnectionPool: any = null;
let mongoDbName = process.env.DB_NAME;
let mongoURI = process.env.DB_URI;
const socketTimeoutMS = Number(process.env.SOCKET_TIMEOUT_MS) || 30000;

export const getKeyValueFromConsul = async (keyName: string | undefined, overrideConsulEndpoint?: string, defaultValue?: string) => {
    const consulEndpoint = overrideConsulEndpoint ? overrideConsulEndpoint : consul_url;

    logger.info(`getting key [${keyName}] value from consul: ${consulEndpoint}`);

    let response: string | ConsulResponse = {
        statusCode: 400,
        body: {},
    };

    console.log(consulEndpoint);

    await axios
        .get(`${consulEndpoint}/v1/kv/${keyName}?raw=true`, {
            headers: {
                'X-Consul-Token': consul_token as string,
            },
        })
        .then(async value => {
            response = value.data;
        })
        .catch(err => {
            if (defaultValue !== undefined) {
                logger.info(`Using Default Consul Key: ${defaultValue}`);
                response = defaultValue;
            } else {
                const errorMsg = `Problem reading Consul Key: ${keyName}, REST Error: ${err}`;
                logger.error(errorMsg);
                throw errorMsg;
            }
        });

    return Promise.resolve(response);
};

export const init = async () => {
    if (!mongoURI) {
        console.log('fetching mongo URI');

        const getMongoUri = await getKeyValueFromConsul(process.env.CONSUL_URI_KEY);

        mongoURI = typeof getMongoUri === 'string' ? getMongoUri : undefined;

        if (!mongoDbName && mongoURI) {
            console.log('fetching mongo DB');
            const myURL = new url.URL(mongoURI);

            mongoDbName = myURL.pathname.slice(1);
            console.log(mongoDbName);
        }
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: next line
    return Promise.resolve(async () => mongoConnReleaseInactivityCount);
};

export const getConnection = async (context?: any, _waitForEventLoop = false, poolSize = 1): Promise<Db> => {
    await init();

    if (mongoDbConnectionPool && mongoDbConnectionPool.isConnected(mongoDbName)) {
        console.log('Reusing the connection from pool');
        return Promise.resolve(mongoDbConnectionPool.db(mongoDbName));
    }

    console.log(`Initializing the new connection... poolSize: ${poolSize}, socketTimeOutMS: ${socketTimeoutMS}`);

    return MongoClient.connect(mongoURI as string, {
        useNewUrlParser: true,
        poolSize: poolSize,
        socketTimeoutMS: socketTimeoutMS,
    })
        .then(dbConnPool => {
            console.log('Initialized the new connection.');
            mongoDbConnectionPool = dbConnPool;
            return mongoDbConnectionPool.db(mongoDbName);
        })
        .catch(err => {
            logger.info(err);
            return getConnection(context, false, 1);
        });
};

export const releaseConnection = async () => {
    if (mongoDbConnectionPool && mongoDbConnectionPool.isConnected(mongoDbName)) {
        console.log('Reusing the connection from pool');
        return mongoDbConnectionPool.close();
    }
};

export const generateUpdateObject = (entityObj: any, ignoreFields: any, replaceFields?: any) => {
    const objstack: any = [
        {
            obj: entityObj,
            root: '',
        },
    ];
    const setFields: any = {},
        unsetFields: any = {};

    if (!replaceFields) replaceFields = [];

    while (objstack.length > 0) {
        const o = objstack.pop();
        const root = o.root;
        const obj = o.obj;
        const keys = Object.keys(obj);
        for (let i = 0, length = keys.length; i < length; i++) {
            const key = keys[i];
            const newRoot = root !== '' ? `${root}.${key}` : key;
            if (obj[key] === undefined || obj[key] === null) {
                unsetFields[newRoot] = '';
            } else if (Array.isArray(obj[key])) {
                setFields[newRoot] = obj[key];
            } else if (replaceFields.includes(obj[key])) {
                setFields[newRoot] = obj[key];
            }
            //Dates come back as objects, we don't want to include dates in the object collection
            else if (typeof obj[key] === 'object' && obj[key] instanceof Date === false) {
                objstack.push({
                    obj: obj[key],
                    root: newRoot,
                });
            } else {
                //skip undefined values or keys need ignoring
                if (!ignoreFields.includes(newRoot)) {
                    if (obj[key] !== undefined) setFields[newRoot] = obj[key];
                }
            }
        }
    }

    const returnObj: any = {};
    if (setFields && Object.keys(setFields).length !== 0) returnObj.set = setFields;

    if (unsetFields && Object.keys(unsetFields).length !== 0) returnObj.unset = unsetFields;

    return returnObj;
};

export const generateObjectID = () => {
    return new ObjectID();
};
