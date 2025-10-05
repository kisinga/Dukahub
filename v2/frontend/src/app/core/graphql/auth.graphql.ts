import { gql } from '@apollo/client';

/**
 * GraphQL operations for admin authentication
 * 
 * Note: These queries use the admin-api endpoint
 * Admin users authenticate with username/password
 * 
 * After setting up codegen, you can use the graphql() function from 
 * './generated' for type-safe queries instead of gql``.
 * 
 * Example:
 * import { graphql } from './generated';
 * const GET_ACTIVE_ADMIN = graphql(`query GetActiveAdministrator { ... }`);
 */

/**
 * GraphQL query to get current active administrator
 */
export const GET_ACTIVE_ADMIN = gql`
  query GetActiveAdministrator {
    activeAdministrator {
      id
      firstName
      lastName
      emailAddress
    }
  }
`;

/**
 * GraphQL mutation to login an administrator
 */
export const LOGIN = gql`
  mutation Login($username: String!, $password: String!, $rememberMe: Boolean) {
    login(username: $username, password: $password, rememberMe: $rememberMe) {
      ... on CurrentUser {
        id
        identifier
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
`;

/**
 * GraphQL mutation to logout current user
 */
export const LOGOUT = gql`
  mutation Logout {
    logout {
      success
    }
  }
`;

/**
 * GraphQL mutation to register a new customer
 */
export const REGISTER_CUSTOMER = gql`
  mutation RegisterCustomer($input: RegisterCustomerInput!) {
    registerCustomerAccount(input: $input) {
      ... on Success {
        success
      }
      ... on MissingPasswordError {
        errorCode
        message
      }
      ... on PasswordValidationError {
        errorCode
        message
        validationErrorMessage
      }
      ... on NativeAuthStrategyError {
        errorCode
        message
      }
    }
  }
`;

/**
 * GraphQL mutation to request password reset
 */
export const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($emailAddress: String!) {
    requestPasswordReset(emailAddress: $emailAddress) {
      ... on Success {
        success
      }
      ... on NativeAuthStrategyError {
        errorCode
        message
      }
    }
  }
`;

/**
 * GraphQL mutation to reset password
 */
export const RESET_PASSWORD = gql`
  mutation ResetPassword($token: String!, $password: String!) {
    resetPassword(token: $token, password: $password) {
      ... on CurrentUser {
        id
        identifier
      }
      ... on PasswordResetTokenInvalidError {
        errorCode
        message
      }
      ... on PasswordResetTokenExpiredError {
        errorCode
        message
      }
      ... on PasswordValidationError {
        errorCode
        message
        validationErrorMessage
      }
      ... on NativeAuthStrategyError {
        errorCode
        message
      }
    }
  }
`;

/**
 * GraphQL mutation to verify customer account
 */
export const VERIFY_CUSTOMER_ACCOUNT = gql`
  mutation VerifyCustomerAccount($token: String!, $password: String) {
    verifyCustomerAccount(token: $token, password: $password) {
      ... on CurrentUser {
        id
        identifier
      }
      ... on VerificationTokenInvalidError {
        errorCode
        message
      }
      ... on VerificationTokenExpiredError {
        errorCode
        message
      }
      ... on PasswordValidationError {
        errorCode
        message
        validationErrorMessage
      }
      ... on PasswordAlreadySetError {
        errorCode
        message
      }
      ... on NativeAuthStrategyError {
        errorCode
        message
      }
    }
  }
`;

/**
 * GraphQL mutation to update customer details
 */
export const UPDATE_CUSTOMER = gql`
  mutation UpdateCustomer($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      id
      title
      firstName
      lastName
      emailAddress
      phoneNumber
    }
  }
`;

/**
 * GraphQL mutation to change password
 */
export const UPDATE_CUSTOMER_PASSWORD = gql`
  mutation UpdateCustomerPassword($currentPassword: String!, $newPassword: String!) {
    updateCustomerPassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      ... on Success {
        success
      }
      ... on InvalidCredentialsError {
        errorCode
        message
      }
      ... on PasswordValidationError {
        errorCode
        message
        validationErrorMessage
      }
      ... on NativeAuthStrategyError {
        errorCode
        message
      }
    }
  }
`;

