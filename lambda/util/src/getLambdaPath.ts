import path from 'path';

export const getAbsoluteLambdaPath = (lambdaName: string) => {
    return path.resolve(path.join('lambda', lambdaName, 'index.ts'));
};
