import {v4} from 'uuid';
import {startOfTomorrow, startOfHour, startOfYesterday, subHours} from 'date-fns';
import {zonedTimeToUtc, utcToZonedTime} from 'date-fns-tz';
import {Db} from 'mongodb';

export const prepareRaptorJobScheduleObject = (raptorObj: any) => {
    //Sets the modified date to the latest..
    raptorObj.ModifiedDateTime = new Date();
    raptorObj.JobCluster = process.env.CLUSTER;

    //READONLY DATA - should not be posted to the DB
    //CreatedDateTime is tracked by using _id (READONLY)
    delete raptorObj.CreatedDateTime;

    //remove all undefined objects
    Object.keys(raptorObj).forEach(key => raptorObj[key] === undefined && delete raptorObj[key]);

    return raptorObj;
};

const getDateAndHoursBetween = (startDate: Date, numOfHours: number) => {
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

const getUTCTimeWRTCurrentTimezone = (dateToBeConverted: Date) => {
    const currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    console.log(`Current TimeZone - ${currentTimeZone}`);

    return zonedTimeToUtc(dateToBeConverted, currentTimeZone);
};

export const getJobRequestObjectForJobType = async (conn: Db, jobschedule: any) => {
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

                                const startOfTomorrowLocalTimeInUTC = getUTCTimeWRTCurrentTimezone(startOfTomorrow());
                                const startOfTomorrowForStation = utcToZonedTime(startOfTomorrowLocalTimeInUTC, stationObj.StationTimeZone);
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
