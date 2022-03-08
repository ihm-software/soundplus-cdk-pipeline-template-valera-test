import {SecretsManagerClient} from '@aws-sdk/client-secrets-manager/dist-types/';
import {getSecretsManagerUtil} from '../src/secrets-manager';

jest.mock('@aws-sdk/secrets-manager-client/');
const SMClientMock = SecretsManagerClient as jest.MockedClass<typeof SecretsManagerClient>;
const smClient = new SMClientMock({});

describe('getSecret', () => {
    beforeEach(() => {
        SMClientMock.mockClear();
    });

    it('should call SSMClient with the correct parameters', async () => {
        const mockSMResponse = {Value: 'fred'};
        SMClientMock.prototype.send.mockImplementation(x => {
            console.log(x);
            return x.input === {} ? Promise.resolve(mockSMResponse) : Promise.resolve(null);
        });

        const secretsManagerUtil = getSecretsManagerUtil(smClient);
        const returnSecret = secretsManagerUtil.getSecret('something');

        expect(SecretsManagerClient.prototype.send).toBeCalledTimes(1);

        expect(returnSecret).toBe('fred');
    });
});
