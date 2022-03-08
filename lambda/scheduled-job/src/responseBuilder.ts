import {Context} from 'aws-lambda';

export type ResponseBuilderResponse = {
    statusCode: number;
    body: {
        message: string;
        functionName: string;
        results: unknown[] | undefined;
    };
};

export type ResponseBuilder = {
    getResponse: (statusCode: number, msg: string, results?: unknown[] | undefined) => ResponseBuilderResponse;
};

export const getResponseBuilder = (context: Context) => {
    return {
        getResponse: (statusCode: number, msg: string, results?: unknown[] | undefined) => {
            return {
                statusCode: statusCode,
                body: JSON.stringify({
                    message: msg,
                    functionName: context.functionName,
                    results,
                }),
            };
        },
    };
};
