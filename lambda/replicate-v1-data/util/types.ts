export type OperationType = 'add' | 'insert' | 'update' | 'delete';
export type Document = Record<string, unknown>;
export type UpdateDescription = {
    updatedFields: Document;
    removedFields: string[];
};

export interface RaptorJobDocument extends Document {
    mongoDocRefId: string;
    JobKey: string;
    OrganizationID: string;
    JobStatus?: string;
    JobType?: string;
    JobName?: string;
    StationID?: string;
    Description?: string;
    JobRequestData?: {
        OrganizationID?: string;
        StationID?: string;
        StationName?: string;
        EventID?: string;
        LoadHistoryFromPlaylist?: boolean;
        IgnoreFillTag?: boolean;
        DoNotSeparateAssets?: boolean;
        FillLength?: number;
        FillStartDateTime?: string;
        FillAnyTags?: string[];
        VoiceTagResolveData?: {
            FallbackVoice?: string[];
            SearchPlaylistIDForVoice?: string;
            SaveToEventID?: string;
            ResolveCount?: number;
            AssetTypeIDs?: string[];
        };
    };
    ModifiedDateTime?: string;
    JobCluster?: string;
    KubeJob?: string;
    JobRunCount?: number;
    Arguments?: string;
    ScheduledDateTime?: string;
}

export interface RaptorJobScheduleDocument extends Document {
    mongoDocRefId: string;
    ScheduleKey: string;
    OrganizationID: string;
    ScheduleJobType?: string;
    ScheduleTitle?: string;
    StartDateTime?: string;
    Enabled?: boolean;
    ScheduleJobData?: Record<string, unknown>;
    StationID?: string;
    CronSchedule?: string;
    ModifiedDateTime?: string;
    JobCluster?: string;
}

export interface EventBridgeDetail {
    _id: Record<string, unknown>;
    operationType: OperationType;
    clusterTime: Record<string, unknown>;
    fullDocument?: Document;
    fullDocumentBeforeChange?: Document;
    ns: {
        db: string;
        coll: string;
    };
    documentKey: Record<string, unknown>;
    updateDescription?: UpdateDescription;
}
