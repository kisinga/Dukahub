/**
 * Re-export generated types from GraphQL schema
 */
export type {
    Channel,
    ChannelList,
    GetAdministratorChannelsQuery
} from '../graphql/generated/graphql';

/**
 * Company type - Direct mapping from Channel query result
 * In Vendure, channels represent different companies/stores
 * 
 * This matches exactly what we fetch from GetAdministratorChannels query
 */
export type Company = {
    id: string;
    code: string;
    token: string;
};

