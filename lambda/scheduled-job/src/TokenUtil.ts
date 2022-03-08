import {Axios} from 'axios';
import Logger from 'loglevel';
import {ParameterStoreUtil} from '../../util/src/parameter-store';
import {SecretsManagerUtil} from '../../util/src/secrets-manager';

export interface TokenUtil {
    getAuthToken: (/*orgID: string,*/) => Promise<null | string>;
}

/**  Get authentication token from iotcore API
 * @param log: Logger.Logger
 * @returns Promise<string>
 */
export const getTokenUtil = (parameterStoreUtil: ParameterStoreUtil, secretsManagerUtil: SecretsManagerUtil, log: Logger.Logger, axios: Axios) => {
    return {
        getAuthToken: async (/*orgID: string,*/): Promise<null | string> => {
            const urlParam = '/soundplus/iotcore/api/url';
            const iotApiUrl = await parameterStoreUtil.getEncryptedParameter(urlParam);

            if (!iotApiUrl) {
                log.error(` Failed to load ${urlParam} from AWS Parameter Store`);
                return null;
            }

            const urlKeySecret = '/soundplus/iotcore/api/key';
            const iotApiKey = await secretsManagerUtil.getSecret(urlKeySecret);
            if (!iotApiKey) {
                log.error(` Failed to load ${urlKeySecret} from AWS Secrets Manager`);
                return null;
            }

            const iotcoreURL = `${iotApiUrl}/iot/createIoTToken`;
            const response = await axios.post(iotcoreURL, null, {
                headers: {
                    'User-Agent': 'Request-Promise',
                    'X-Api-Key': iotApiKey,
                    /*'z-cloud-org-id': orgID,*/
                },
            });

            return response.headers['x-amzn-token'];
        },
    };
};
