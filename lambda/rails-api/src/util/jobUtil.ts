import {generateUpdateObject, getConnection} from './mongoDBHelper';
import {createLogger, transports} from 'winston';
import {startOfTomorrow, startOfHour, startOfYesterday, subHours} from 'date-fns';
import {zonedTimeToUtc, utcToZonedTime} from 'date-fns-tz';
import {v4} from 'uuid';

const logger = createLogger({
    transports: [new transports.Console()],
});

const connPromise = getConnection();
let conn;

export const GetJobAsync = async (orgId: string, jobKey: string) => submitGetJobAsync(orgId, jobKey);

export const CreateJobAsync = async (body: any) => submitCreateJobAsync(body);

export const PutJobAsync = async (body: any) => submitPutJobAsync(body);

export const PatchJobAsync = async (body: any) => submitPatchJobAsync(body);

export const AddOrUpdateJobAsync = async (body: any) => submitAddOrUpdateJobAsync(body);

const prepareRaptorJobObject = (raptorObj: any) => {
    switch (raptorObj.JobStatus) {
        case 'Scheduled':
            raptorObj.ScheduledDateTime = new Date();
            break;
        case 'Running':
            raptorObj.RunningDateTime = new Date();
            break;
        case 'Completed':
            raptorObj.CompletedDateTime = new Date();
            break;
    }

    //Sets the modified date to the latest..
    raptorObj.ModifiedDateTime = new Date();

    //READONLY DATA - should not be posted to the DB
    //CreatedDateTime is tracked by using _id (READONLY)
    delete raptorObj.CreatedDateTime;

    //remove all undefined objects
    Object.keys(raptorObj).forEach(key => raptorObj[key] === undefined && delete raptorObj[key]);

    return raptorObj;
};

const submitGetJobAsync = async (orgId: string, jobKey: string) => {
    let response;

    conn = await connPromise;
    const resultJson = await conn.collection('RaptorJob').findOne({OrganizationID: orgId, JobKey: jobKey});

    if (resultJson !== null) {
        resultJson.CreatedDateTime = resultJson._id.getTimestamp();
        delete resultJson._id;

        response = {
            statusCode: 200,
            body: JSON.stringify(resultJson),
        };
    } else {
        const msg = `Could not GET Job because OrgID = ${orgId} JobKey = ${jobKey} was not found`;
        logger.error(msg);
        response = {
            statusCode: 404,
            body: msg,
        };
    }

    return response;
};

const submitPutJobAsync = async (jobObj: any) => {
    logger.info('Entering submitPutJobAsync');

    let response;

    conn = await connPromise;

    const raptorObj = prepareRaptorJobObject(jobObj); //Set Modified time and remove undefines..
    //Make sure the job has a name....
    if (!raptorObj.JobName) {
        raptorObj.JobName = raptorObj.JobKey;
    }
    //Make suer we have a job cluster
    if (!raptorObj.JobCluster) {
        raptorObj.JobCluster = process.env.CLUSTER;
    }

    const upserted = await conn
        .collection('RaptorJob')
        .findOneAndReplace({OrganizationID: raptorObj.OrganizationID, JobKey: raptorObj.JobKey}, raptorObj, {upsert: true, returnOriginal: false});

    if (upserted.ok) {
        //only return the created time if the record was upserted
        if (upserted.value && upserted.lastErrorObject && !upserted.lastErrorObject.updatedExisting && upserted.value._id) {
            raptorObj.CreatedDateTime = upserted.value._id.getTimestamp();
        }

        response = {
            statusCode: 200,
            body: JSON.stringify(raptorObj),
        };
    } else {
        const msg = `Could not PUT Job during database operation, JobKey ${raptorObj.JobKey}`;
        response = {
            statusCode: 400,
            body: JSON.stringify(msg),
        };
    }

    return response;
};

const submitCreateJobAsync = async (jobObj: any) => {
    logger.info('Entering submitCreateJobAsync');

    let response;
    conn = await connPromise;

    const raptorObj = prepareRaptorJobObject(jobObj); //Set Modified time and remove undefines..
    //Make sure the job has a name....
    if (!raptorObj.JobName) {
        raptorObj.JobName = raptorObj.JobKey;
    }
    //Make suer we have a job cluster
    if (!raptorObj.JobCluster) {
        raptorObj.JobCluster = process.env.CLUSTER;
    }

    const inserted = await conn.collection('RaptorJob').insertOne(raptorObj);

    if (inserted.insertedCount === 1) {
        raptorObj.CreatedDateTime = raptorObj._id.getTimestamp();
        delete raptorObj._id;

        response = {
            statusCode: 200,
            body: JSON.stringify(raptorObj),
        };
    } else {
        const msg = `Could not CREATE Job during database operation, JobKey ${raptorObj}`;
        response = {
            statusCode: 400,
            body: JSON.stringify(msg),
        };
    }
    return response;
};

const submitPatchJobAsync = async (jobObj: any) => {
    logger.info('Entering submitPatchJobAsync');
    let response;

    conn = await connPromise;

    const raptorObj = prepareRaptorJobObject(jobObj); //Set Modified time and remove undefines..

    //---- CASE REPLACE PATCH
    //Need to do special merge patched, with Arrays that have KEYS
    const updateObject = await generateUpdateObject(raptorObj, ['OrganizationID', 'JobKey'], ['JobResultData']);
    logger.info(`Update Object ${JSON.stringify(updateObject.set)} - ${JSON.stringify(updateObject.push)} - ${JSON.stringify(updateObject.unset)}`);

    const find = await conn.collection('RaptorJob').findOneAndUpdate(
        {
            JobKey: raptorObj.JobKey,
            OrganizationID: raptorObj.OrganizationID,
        },
        {...(updateObject.set && {$set: updateObject.set}), ...(updateObject.unset && {$unset: updateObject.unset})},
        {returnOriginal: false}
    );

    if (find.ok) {
        response = {
            statusCode: 200,
            body: JSON.stringify(raptorObj),
        };
    } else {
        const msg = `Problem during PATCH on Job, OrganizationID: ${raptorObj.OrganizationID}, JobKey ${raptorObj.JobKey}.\r\nResult: ${JSON.stringify(find)}`;
        response = {
            statusCode: 400,
            body: JSON.stringify(msg),
        };
    }

    return response;
};

const submitAddOrUpdateJobAsync = async (jobObj: any) => {
    logger.info('Entering submitAddOrUpdateJobAsync');
    let response;

    conn = await connPromise;
    const raptorObj = prepareRaptorJobObject(jobObj); //Set Modified time and remove undefines..

    //---- CASE REPLACE PATCH
    //Need to do special merge patched, with Arrays that have KEYS
    const updateObject = await generateUpdateObject(raptorObj, ['OrganizationID', 'JobKey'], ['JobResult']);
    logger.info(`Update Object ${JSON.stringify(updateObject.set)} - ${JSON.stringify(updateObject.push)} - ${JSON.stringify(updateObject.unset)}`);

    const patchOrInsertResponse = await conn.collection('RaptorJob').findOneAndUpdate(
        {
            JobKey: raptorObj.JobKey,
            OrganizationID: raptorObj.OrganizationID,
        },
        {...(updateObject.set && {$set: updateObject.set}), ...(updateObject.unset && {$unset: updateObject.unset})},
        {upsert: true, returnOriginal: false}
    );

    if (patchOrInsertResponse.ok) {
        //if we created a record return the created datetime
        if (
            patchOrInsertResponse.value &&
            patchOrInsertResponse.lastErrorObject &&
            !patchOrInsertResponse.lastErrorObject.updatedExisting &&
            patchOrInsertResponse.value._id
        ) {
            raptorObj.CreatedDateTime = patchOrInsertResponse.value._id.getTimestamp();
            delete raptorObj._id;
        }

        response = {
            statusCode: 200,
            body: JSON.stringify(raptorObj),
        };
    } else {
        const msg = `Problem during AddOrUpdate Job, OrganizationID: ${raptorObj.OrganizationID}, JobKey ${raptorObj.JobKey}.\r\nResult: ${JSON.stringify(
            patchOrInsertResponse
        )}`;
        response = {
            statusCode: 400,
            body: JSON.stringify(msg),
        };
    }

    return response;
};

export const runJobAsync = async (z_cloud_org_id: string, jobkey: string) => {
    let response = {
        statusCode: 400,
        body: {},
    };

    try {
        //Get job from database
        conn = await connPromise;
        const job = await conn.collection('RaptorJob').findOne({OrganizationID: z_cloud_org_id, JobKey: jobkey}, {projection: {_id: 0}});

        console.log(job);

        response = {
            statusCode: 200,
            body: JSON.stringify(job),
        };

        if (job) {
            if (job.JobStatus !== 'Ready') {
                //Can't schedule the job the job does not have a status of ready!
                const msg = 'Unable to run Job: must have a "Ready" Status';
                logger.error(msg);
                response = {
                    statusCode: 400,
                    body: msg,
                };
            }
        }
    } catch (err) {
        const msg = `Unable to Run Job: ${err}`;
        logger.error(msg);
        response = {
            statusCode: 500,
            body: msg,
        };
    }

    logger.info(response);
    return response;
};

const getUTCTimeWRTCurrentTimezone = (dateToBeCoverted: any) => {
    const currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log(`Current TimeZone - ${currentTimeZone}`);
    return zonedTimeToUtc(dateToBeCoverted, currentTimeZone);
};

export const getJobRequestObjectForJobType = async (conn: any, jobschedule: any) => {
    if (jobschedule) {
        const jobRequestData = null;
        switch (jobschedule.ScheduleJobType) {
            case 'GSSchedSync':
                if (jobschedule.ScheduleJobData) {
                    const data = jobschedule.ScheduleJobData;
                    if (data.StationID) {
                        if (data.IntervalType && data.IntervalCount) {
                            // check if schedule exists for tomorrow and n days post that...
                            const stationObj = await conn.collection('RaptorStation').findOne({
                                OrganizationID: jobschedule.OrganizationID,
                                StationID: data.StationID,
                            });
                            if (stationObj) {
                                let dates = [];

                                const startOfTommorrowLocalTimeInUTC = getUTCTimeWRTCurrentTimezone(startOfTomorrow());
                                const startOfTomorrowForStation = utcToZonedTime(startOfTommorrowLocalTimeInUTC, stationObj.StationTimeZone);
                                console.log(`Start of tomorrow ${startOfTomorrowForStation} - timezone ${stationObj.StationTimeZone}`);
                                const stationDateTimeUTC = zonedTimeToUtc(startOfTomorrowForStation, stationObj.StationTimeZone);
                                console.log(`Station time as UTC ${stationDateTimeUTC} - timezone ${stationObj.StationTimeZone}`);

                                if ((data.IntervalType === 1 || data.IntervalType === 2) && data.IntervalCount > 0) {
                                    dates = getDateAndHoursBetween(
                                        stationDateTimeUTC,
                                        data.IntervalType === '1' ? data.IntervalCount * 24 : data.IntervalCount
                                    );
                                } else {
                                    dates = getDateAndHoursBetween(stationDateTimeUTC, 24);
                                }

                                // fetching following dates
                                console.log(`fetching following dates = ${dates}`);

                                return {
                                    OrganizationID: jobschedule.OrganizationID,
                                    StationID: stationObj.StationID,
                                    DateAndHours: dates,
                                };
                            }
                        }
                    }
                }
                break;
            case 'GSScheduleRecon':
                if (jobschedule.ScheduleJobData) {
                    const data = jobschedule.ScheduleJobData;
                    if (data.StationID) {
                        if (data.IntervalType && data.IntervalCount) {
                            // check if schedule exists for tomorrow and n days post that...
                            const stationObj = await conn.collection('RaptorStation').findOne({
                                OrganizationID: jobschedule.OrganizationID,
                                StationID: data.StationID,
                            });
                            if (stationObj) {
                                let dates: any = [];
                                if (data.IntervalType === 1) {
                                    const startOfYesterdayLocalTime = getUTCTimeWRTCurrentTimezone(startOfYesterday());
                                    const startOfYesterdayForStation = utcToZonedTime(startOfYesterdayLocalTime, stationObj.StationTimeZone);
                                    const stationDateTimeUTC = zonedTimeToUtc(startOfYesterdayForStation, stationObj.StationTimeZone);

                                    dates = getDateAndHoursBetween(stationDateTimeUTC, data.IntervalCount > 0 ? data.IntervalCount * 24 : 24);
                                } else if (data.IntervalType === 2) {
                                    const startOfPreviousHoursLocalTime = subHours(
                                        getUTCTimeWRTCurrentTimezone(startOfHour(new Date())),
                                        data.IntervalCount > 0 ? data.IntervalCount : 1
                                    );
                                    const startOfPreviousHourForStation = utcToZonedTime(startOfPreviousHoursLocalTime, stationObj.StationTimeZone);
                                    const stationDateTimeUTC = zonedTimeToUtc(startOfPreviousHourForStation, stationObj.StationTimeZone);

                                    dates = getDateAndHoursBetween(stationDateTimeUTC, data.IntervalCount > 0 ? data.IntervalCount : 1);
                                }
                                // fetching following dates
                                console.log(`fetching following dates = ${dates}`);

                                return {
                                    OrganizationID: jobschedule.OrganizationID,
                                    StationID: stationObj.StationID,
                                    StartDateTime: dates[0],
                                    EndDateTime: dates[dates.length - 1],
                                };
                            }
                        }
                    }
                }
                break;
            case 'GSAssetPullLatest':
                if (jobschedule.ScheduleJobData) {
                    const data = jobschedule.ScheduleJobData;
                    if (data.StationID) {
                        const stationObj = await conn.collection('RaptorStation').findOne({
                            OrganizationID: jobschedule.OrganizationID,
                            StationID: data.StationID,
                        });
                        if (stationObj) {
                            return {
                                OrganizationID: jobschedule.OrganizationID,
                                StationID: stationObj.StationID,
                            };
                        }
                    }
                }
                break;
            case 'GSSchedPullLatest':
                if (jobschedule.ScheduleJobData) {
                    const data = jobschedule.ScheduleJobData;
                    if (data.StationID) {
                        const stationObj = await conn.collection('RaptorStation').findOne({
                            OrganizationID: jobschedule.OrganizationID,
                            StationID: data.StationID,
                        });
                        if (stationObj) {
                            return {
                                OrganizationID: jobschedule.OrganizationID,
                                StationID: stationObj.StationID,
                                RestrictPublicationStatus: data.RestrictPublicationStatus,
                                PastHours: data.PastHours,
                            };
                        }
                    }
                }
                break;
            case 'FTPIngest':
                if (jobschedule.ScheduleJobData) {
                    return jobschedule.ScheduleJobData;
                }
                break;
            default:
                break;
        }
        return jobRequestData;
    }
    return null;
};

export const getJobKey = async (jobschedule: any) => {
    if (jobschedule) {
        switch (jobschedule.ScheduleJobType) {
            case 'GSSchedSync':
                return `sched-${jobschedule.ScheduleJobType}-${v4()}`;
            default:
                return `sched-${jobschedule.ScheduleJobType}-${v4()}`;
        }
    }
    return null;
};

const getDateAndHoursBetween = (startDate: any, numOfHours: any) => {
    const dates = [];

    // Strip hours minutes seconds etc.
    let currentDateAndHour = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startDate.getHours(), 0, 0);

    const endDateAndHour = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startDate.getHours() + (numOfHours - 1), 0, 0);

    while (currentDateAndHour <= endDateAndHour) {
        dates.push(currentDateAndHour);

        currentDateAndHour = new Date(
            currentDateAndHour.getFullYear(),
            currentDateAndHour.getMonth(),
            currentDateAndHour.getDate(),
            currentDateAndHour.getHours() + 1 // Will increase date if over range
        );
    }

    return dates;
};
