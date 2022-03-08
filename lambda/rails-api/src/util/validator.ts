import Ajv from 'ajv';
import {createLogger, transports} from 'winston';

const logger = createLogger({
    transports: [new transports.Console()],
});

const theSchema = require('../../assets/RaptorComplete.schema.json');
let ajv: Ajv.Ajv | null = null;
let validator: Ajv.ValidateFunction | null = null;

export const validateJSON = async (theType: string, theJSON: any, requiredFields: any, allowAdditionalProperties = false) => {
    console.log(theJSON);
    if (!ajv) {
        ajv = new Ajv({
            allErrors: true,
            unknownFormats: ['guid', 'double', 'int64'],
            missingRefs: 'ignore',
        });
        ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
        if (theType === 'RaptorUser') theSchema.definitions[theType].properties.profile.required = requiredFields;
        else theSchema.definitions[theType].required = requiredFields;
        theSchema.definitions[theType].additionalProperties = allowAdditionalProperties;

        validator = ajv.compile(theSchema);
    }

    const jsn = {
        [theType]: theJSON,
    };
    let errors = '';
    if (!(validator as Ajv.ValidateFunction)(jsn)) {
        errors = JSON.stringify(validator?.errors);
    }
    console.log(errors);
    return errors;
};

const regexGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ValidateGuid(stringToCheck: string, response: any, errorMsg: any) {
    if (true !== regexGuid.test(stringToCheck)) {
        const msg = `Validation error, ${errorMsg}.`;
        logger.error(msg);
        response.statusCode = 400;
        response.body = JSON.stringify({
            message: msg,
        });
        return response;
    }
}
