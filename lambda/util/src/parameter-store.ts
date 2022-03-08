import {SSMClient, GetParameterCommand} from '@aws-sdk/client-ssm';

const getParameterWorker = async (ssmClient: SSMClient, name: string, decrypt: boolean): Promise<string | undefined> => {
    const result = await ssmClient.send(new GetParameterCommand({Name: name, WithDecryption: decrypt}));
    return result?.Parameter?.Value;
};

export interface ParameterStoreUtil {
    getParameter: (name: string) => Promise<string | undefined>;
    getEncryptedParameter: (name: string) => Promise<string | Error>;
}

export const getParameterStoreUtil = (ssm: SSMClient) => {
    return {
        getParameter: async (path: string): Promise<string | undefined> => {
            return getParameterWorker(ssm, path, false);
        },
        getEncryptedParameter: async (path: string): Promise<string | Error> => {
            const param = await getParameterWorker(ssm, path, true);
            return param ?? new Error(`Failed to load ${path} from AWS Parameter Store`);
        },
    };
};
