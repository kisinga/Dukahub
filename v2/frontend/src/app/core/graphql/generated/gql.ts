/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query GetActiveAdministrator {\n    activeAdministrator {\n      id\n      firstName\n      lastName\n      emailAddress\n    }\n  }\n": typeof types.GetActiveAdministratorDocument,
    "\n  mutation Login($username: String!, $password: String!, $rememberMe: Boolean) {\n    login(username: $username, password: $password, rememberMe: $rememberMe) {\n      ... on CurrentUser {\n        id\n        identifier\n        channels {\n          id\n          code\n          token\n        }\n      }\n      ... on InvalidCredentialsError {\n        errorCode\n        message\n      }\n      ... on NativeAuthStrategyError {\n        errorCode\n        message\n      }\n    }\n  }\n": typeof types.LoginDocument,
    "\n  mutation Logout {\n    logout {\n      success\n    }\n  }\n": typeof types.LogoutDocument,
    "\n  mutation UpdateAdministrator($input: UpdateActiveAdministratorInput!) {\n    updateActiveAdministrator(input: $input) {\n      id\n      firstName\n      lastName\n      emailAddress\n    }\n  }\n": typeof types.UpdateAdministratorDocument,
    "\n  query GetAdministratorChannels {\n    channels {\n      items {\n        id\n        code\n        token\n      }\n    }\n  }\n": typeof types.GetAdministratorChannelsDocument,
};
const documents: Documents = {
    "\n  query GetActiveAdministrator {\n    activeAdministrator {\n      id\n      firstName\n      lastName\n      emailAddress\n    }\n  }\n": types.GetActiveAdministratorDocument,
    "\n  mutation Login($username: String!, $password: String!, $rememberMe: Boolean) {\n    login(username: $username, password: $password, rememberMe: $rememberMe) {\n      ... on CurrentUser {\n        id\n        identifier\n        channels {\n          id\n          code\n          token\n        }\n      }\n      ... on InvalidCredentialsError {\n        errorCode\n        message\n      }\n      ... on NativeAuthStrategyError {\n        errorCode\n        message\n      }\n    }\n  }\n": types.LoginDocument,
    "\n  mutation Logout {\n    logout {\n      success\n    }\n  }\n": types.LogoutDocument,
    "\n  mutation UpdateAdministrator($input: UpdateActiveAdministratorInput!) {\n    updateActiveAdministrator(input: $input) {\n      id\n      firstName\n      lastName\n      emailAddress\n    }\n  }\n": types.UpdateAdministratorDocument,
    "\n  query GetAdministratorChannels {\n    channels {\n      items {\n        id\n        code\n        token\n      }\n    }\n  }\n": types.GetAdministratorChannelsDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetActiveAdministrator {\n    activeAdministrator {\n      id\n      firstName\n      lastName\n      emailAddress\n    }\n  }\n"): (typeof documents)["\n  query GetActiveAdministrator {\n    activeAdministrator {\n      id\n      firstName\n      lastName\n      emailAddress\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Login($username: String!, $password: String!, $rememberMe: Boolean) {\n    login(username: $username, password: $password, rememberMe: $rememberMe) {\n      ... on CurrentUser {\n        id\n        identifier\n        channels {\n          id\n          code\n          token\n        }\n      }\n      ... on InvalidCredentialsError {\n        errorCode\n        message\n      }\n      ... on NativeAuthStrategyError {\n        errorCode\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation Login($username: String!, $password: String!, $rememberMe: Boolean) {\n    login(username: $username, password: $password, rememberMe: $rememberMe) {\n      ... on CurrentUser {\n        id\n        identifier\n        channels {\n          id\n          code\n          token\n        }\n      }\n      ... on InvalidCredentialsError {\n        errorCode\n        message\n      }\n      ... on NativeAuthStrategyError {\n        errorCode\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Logout {\n    logout {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation Logout {\n    logout {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateAdministrator($input: UpdateActiveAdministratorInput!) {\n    updateActiveAdministrator(input: $input) {\n      id\n      firstName\n      lastName\n      emailAddress\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateAdministrator($input: UpdateActiveAdministratorInput!) {\n    updateActiveAdministrator(input: $input) {\n      id\n      firstName\n      lastName\n      emailAddress\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GetAdministratorChannels {\n    channels {\n      items {\n        id\n        code\n        token\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetAdministratorChannels {\n    channels {\n      items {\n        id\n        code\n        token\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;