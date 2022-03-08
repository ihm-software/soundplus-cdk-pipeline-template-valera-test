import {SecretsManagerClient, GetSecretValueCommand} from '@aws-sdk/client-secrets-manager';

export const getSecretWorker = async (smClient: SecretsManagerClient, secredId: string): Promise<string | undefined> => {
    const result = await smClient.send(new GetSecretValueCommand({SecretId: secredId}));
    return result?.SecretString;
};

export interface SecretsManagerUtil {
    getSecret: (secredId: string) => Promise<string | undefined>;
}

export const getSecretsManagerUtil = (smc: SecretsManagerClient) => {
    return {
        getSecret: async (secredId: string): Promise<string | undefined> => {
            return getSecretWorker(smc, secredId);
        },
    };
};
