import {SSMClient} from '@aws-sdk/client-ssm/dist-types/SSMClient';
import {getParameterStoreUtil} from '../src/parameter-store';

jest.mock('@aws-sdk/client-ssm/');
const SSMClientMock = SSMClient as jest.MockedClass<typeof SSMClient>;
const ssmClient = new SSMClientMock({});

describe('getEncryptedParameter', () => {
    beforeEach(() => {
        SSMClientMock.mockClear();
    });

    it('should call SSMClient with the correct parameters', async () => {
        const mockSSMResponse = {Value: 'fred'};
        SSMClientMock.prototype.send.mockImplementation(x => {
            console.log(x);
            return x.input === {} ? Promise.resolve(mockSSMResponse) : Promise.resolve(null);
        });

        const parameterStoreUtil = getParameterStoreUtil(ssmClient);
        const returnParameter = parameterStoreUtil.getEncryptedParameter('something');

        expect(SSMClient.prototype.send).toBeCalledTimes(1);

        expect(returnParameter).toBe('fred');
    });
});
