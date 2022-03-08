import {
    ExecuteStatementCommandInput,
    ExecuteStatementCommandOutput,
    ExecuteTransactionCommandInput,
    ExecuteTransactionCommandOutput,
} from '@aws-sdk/client-dynamodb';
import {HttpHandlerOptions} from '@aws-sdk/types';
import {Logger} from 'loglevel';

export type DynamoDBExecute = {
    executeStatement(args: ExecuteStatementCommandInput, options?: HttpHandlerOptions): Promise<ExecuteStatementCommandOutput>;
    executeTransaction(args: ExecuteTransactionCommandInput, options?: HttpHandlerOptions): Promise<ExecuteTransactionCommandOutput>;
};

/** creating some nonsense here to get compiled */
const unmarshall = (something: any): any => {
    console.log(something);
};
class Cron {
    constructor(arg: any) {
        console.log(arg);
    }
    fromString(arg: any) {
        console.log(arg);
    }
    schedule(): any {}
}
/** end creating some nonsense here to get compiled */

/**
 * Set the NextRunDateTime for any JobSchedule items for which it is not set (usually newly created)!
 */
export const setNextRunDateTimeForNewJobSchedules = async (log: Logger, dynamoDB: DynamoDBExecute) => {
    try {
        const noNextStatement = `SELECT * FROM RaptorJobSchedule WHERE Enabled = true 
        and (attribute_not_exists(NextRunDateTime) or NextRunDateTime is null)`;
        /**
         * Note that the StartDateTime is not really used currently - it is getting set to
         * moment($('#jobSchedulerConfig input.job-schedule-start-date-time').val()).toISOString(true);
         * but the job-schedule-start-date-time in the UI is commented out. - bottom line is that it is set to the time of creation of the job schedule.
         * in order for this to work properly with the "string" date time comparisons that we do below, we should make sure that we save this
         * as UTC time - the same format rest of the time that we use and compare!!!
         * and (attribute_not_exists(StartDateTime) or StartDateTime is null or StartDateTime < '${moment.utc().toISOString(true)}' )`;
         */
        const noNextData = await dynamoDB.executeStatement({Statement: noNextStatement});

        if (!noNextData || !noNextData?.Items || noNextData?.Items?.length === 0) {
            const msg = 'There is not even a single job schedule without a set NextRunDateTime';
            log.info(msg);
            return;
        }

        for await (const dbItem of noNextData?.Items) {
            const item = unmarshall(dbItem);

            /**
             * Calculate NextRunDateTime from CronSchedule
             * NOTE - we do NOT need to get the station timezone
             * The times saved in the job schedule are already in UTC, we need to set the time to UTC in the cronInstance.
             */

            const cronInstance = new Cron({
                timezone: 'UTC',
            });

            cronInstance.fromString(item.CronSchedule);

            const updateNextRunDateTimeStatement = `UPDATE RaptorJobSchedule 
            set NextRunDateTime = '${cronInstance.schedule().next().format()}'
            WHERE ScheduleKey = '${item.ScheduleKey}'
            AND OrganizationID = '${item.OrganizationID}'`;

            try {
                const updateNextRunDateTime = await dynamoDB.executeStatement({Statement: updateNextRunDateTimeStatement});
                const msg = `Successfully set NextRunDateTimes. Statement: ${updateNextRunDateTimeStatement} Result: ${updateNextRunDateTime}`;
                log.info(msg);
            } catch (err) {
                const msg = `Failed to set NextRunDateTime. Statement: ${updateNextRunDateTimeStatement} Error: ${err}.`;
                log.error(msg);
            }
        }

        log.info('Finished processing all of the job schedules without set NextRunDateTime values.');
    } catch (err) {
        const msg = `Failed to set NextRunDateTime For New JobSchedules: ${err}.`;
        log.error(msg);
    }
};

/**
 * Get jobSchedule entries for which we should schedule jobs
 * note that for now the EndDateTie and the MaxCount are not used - strip them out of the query for now.
 * @param utcNow the NextRunDateTime : String
 * @returns Promise<any>
 */
export const getDueSchedules = async (utcNow: string, log: Logger, dynamoDB: DynamoDBExecute) => {
    const dueSchedulesStatement = `SELECT * 
        FROM RaptorJobSchedule
        WHERE Enabled = true
            and NextRunDateTime is not null 
            and NextRunDateTime < '${utcNow}'
            and LastRunDateTime < NextRunDateTime --  LastRunDateTime will be greater than the NextRunDateTime if a job was already scheduled for the current iteration of the jobschedule`;

    /**
     * Unsupported for now - might be added to above query
     * and (attribute_not_exists(EndDateTime) or EndDateTime is null or EndDateTime > '${utcNow}' )
     * and (attribute_not_exists(MaxCount) or MaxCount < ScheduledJobsCount) `;
     */

    let dueSchedules = null;
    try {
        dueSchedules = await dynamoDB.executeStatement({Statement: dueSchedulesStatement});
    } catch (err) {
        const msg = `Failed to load the due schedules from the RaptorJobSchedule: ${err}.`;
        log.error(msg);
    }

    return dueSchedules;
};

/** Unused
 * THIS STATEMENT IS NOT WORKING DUE TO CURRENT LIMITATIONS IN DYNAMODB! LEFT FOR FUTURE REFERENCE
 * Cannot select from indexes in transactions, but cannot do EXISTS in statement (must be transaction), also the WHERE clause must include the primary key...
 * get jobSchedule entries for which we should schedule jobs
 * note that for now the EndDateTie and the MaxCount are not used - strip them out of the query for now.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getDueSchedulesTransaction = async (utcNow: string, log: Logger, dynamoDB: DynamoDBExecute) => {
    const dueSchedulesStatement = {
        TransactStatements: [
            {
                Statement: `SELECT * 
                FROM "RaptorJobSchedule"."NextRunDateTimeIndex"
                WHERE Enabled = true
                    and NextRunDateTime is not null 
                    and NextRunDateTime < '${utcNow}'
                    and LastRunDateTime < NextRunDateTime --  LastRunDateTime will be greater than the NextRunDateTime if a job was already scheduled for the current iteration of the jobschedule
                    and NOT EXISTS (SELECT * 
                        FROM "RaptorJob"."ScheduleKeyIndex"
                        WHERE attribute_exists(ScheduleKey) 
                            and ScheduleKey = RaptorJobSchedule.ScheduleKey 
                            -- and CreatedDateTime > RaptorJobSchedule.NextRunDateTime -- if the job was created after the last update of the NextRunDateTime -- after discussion with Ramesh, Josh, and Puneet was decided to not trigger new instance if there is already a job running for now.
                            and ( JobStatus IN ['Preparing', 'Ready', 'Scheduled', 'Running'] )
                `,
            },
        ],
    };

    //and (attribute_not_exists(EndDateTime) or EndDateTime is null or EndDateTime > '${utcNow}' )
    //and (attribute_not_exists(MaxCount) or MaxCount < ScheduledJobsCount) `;

    // What if there is a job that was created before the current execution is still running? -- after discussion with Ramesh, Josh, and Puneet was decided to not trigger new instance if there is already a job running for now.
    let dueSchedules = null;
    try {
        dueSchedules = await dynamoDB.executeTransaction(dueSchedulesStatement);
    } catch (err) {
        const msg = `Failed to load the due schedules from the RaptorJobSchedule in transaction: ${err}.`;
        log.error(msg);
    }

    if (dueSchedules && dueSchedules.Responses && dueSchedules.Responses.length > 0) {
        return dueSchedules.Responses[0].Item;
    }
    return null;
};

/**
 * Get the active Jobs
 * @param scheduleKey String
 * @returns
 */
export const getActiveJobsWithScheduleKey = async (scheduleKey: string, log: Logger, dynamoDB: DynamoDBExecute /*, nextRunDateTime: any*/) => {
    const activeJobsStatement = `SELECT JobKey
        FROM RaptorJob 
        WHERE attribute_exists(ScheduleKey) 
            and ScheduleKey = '${scheduleKey}'
            and ( JobStatus IN ['Preparing', 'Ready', 'Scheduled', 'Running'] )`;
    /** and CreatedDateTime > {nextRunDateTime}
     * if the job was created after the last update of the NextRunDateTime
     * after discussion with Ramesh, Josh, and Puneet was decided to not trigger new instance if there is already a job running for now.
     */

    let activeJobs = null;
    try {
        activeJobs = await dynamoDB.executeStatement({Statement: activeJobsStatement});
    } catch (err) {
        const msg = `Failed to load the active jobs with schedule key: ${scheduleKey} Error: ${err}.`;
        log.error(msg);
    }

    return activeJobs;
};
