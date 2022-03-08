const debug = process.env.DEBUG === 'true' ?? false;
export const log = (text: string, o?: object) => {
    if (debug) console.log(text, o);
};

export const logEventData = (eventData: Record<string, unknown>) => {
    const {operationType, tableName, previousData, updatedData, updateDescription} = eventData;
    log('Incoming Event Data: ', {
        OperationType: operationType,
        TableName: tableName,
        PreviousData: previousData,
        UpdatedData: updatedData,
        UpdateDescription: updateDescription,
    });
    return;
};
