import { graphql } from './generated';

/**
 * GraphQL operations for admin authentication
 * 
 * Note: These queries use the admin-api endpoint
 * Admin users authenticate with username/password
 * 
 * All operations are fully typed using GraphQL Code Generator
 * The graphql() function returns typed DocumentNodes that codegen processes
 */

/**
 * GraphQL query to get current active administrator
 */
export const GET_ACTIVE_ADMIN = graphql(`
  query GetActiveAdministrator {
    activeAdministrator {
      id
      firstName
      lastName
      emailAddress
    }
  }
`);

/**
 * GraphQL mutation to login an administrator
 */
export const LOGIN = graphql(`
  mutation Login($username: String!, $password: String!, $rememberMe: Boolean) {
    login(username: $username, password: $password, rememberMe: $rememberMe) {
      ... on CurrentUser {
        id
        identifier
        channels {
          id
          code
          token
        }
      }
      ... on InvalidCredentialsError {
        errorCode
        message
      }
      ... on NativeAuthStrategyError {
        errorCode
        message
      }
    }
  }
`);

/**
 * GraphQL mutation to logout current user
 */
export const LOGOUT = graphql(`
  mutation Logout {
    logout {
      success
    }
  }
`);

/**
 * GraphQL mutation to update administrator details
 * Note: This is an admin-api operation for updating the current admin's info
 */
export const UPDATE_ADMINISTRATOR = graphql(`
  mutation UpdateAdministrator($input: UpdateActiveAdministratorInput!) {
    updateActiveAdministrator(input: $input) {
      id
      firstName
      lastName
      emailAddress
    }
  }
`);

