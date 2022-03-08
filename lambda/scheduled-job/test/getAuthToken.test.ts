// import {getTokenUtil} from '../src/TokenUtil';
// eslint-disable-next-line node/no-unpublished-import
// import {decode} from 'jsonwebtoken';
import Logger from 'loglevel';
// import {SSMClient} from '@aws-sdk/client-ssm/dist-types/SSMClient';

const log = Logger.getLogger('runScheduledJob');
const level = Logger.levels.DEBUG;
log.setLevel(level);

// const getEncryptedParameterMock = jest.fn(input => (input === {} ? {} : {}));

describe('getAuthToken', () => {
    beforeEach(() => {});

    it('should return a token', async () => {
        // const token = await getTokenUtil(ssmClient, log);
        // const decodedToken = decode(token, {complete: true, json: true});
        // expect(SSMClient.prototype.send).toBeCalledTimes(1);
        // expect(decodedToken).toBe(true);
    });
});
