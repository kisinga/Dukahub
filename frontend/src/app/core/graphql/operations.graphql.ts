import { graphql } from './generated';

/**
 * ============================================================================
 * ALL GRAPHQL OPERATIONS - SINGLE SOURCE OF TRUTH
 * ============================================================================
 * 
 * This file contains ALL GraphQL queries and mutations used in the application.
 * Organized by domain for easy navigation.
 * 
 * WHY ONE FILE?
 * - No circular dependencies
 * - No codegen bootstrapping issues  
 * - Easy to find and maintain all operations
 * - Single import point for services
 * - Guaranteed type generation
 * 
 * The graphql() function returns typed DocumentNodes that codegen processes.
 */

// ============================================================================
// AUTHENTICATION & USER MANAGEMENT
// ============================================================================

export const GET_ACTIVE_ADMIN = graphql(`
  query GetActiveAdministrator {
    activeAdministrator {
      id
      firstName
      lastName
      emailAddress
      user {
        id
        identifier
        roles {
          id
          code
          permissions
        }
      }
    }
  }
`);

// Legacy login mutation (kept for backward compatibility during transition)
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

// Phone-based OTP authentication mutations
export const REQUEST_REGISTRATION_OTP = graphql(`
  mutation RequestRegistrationOTP($phoneNumber: String!, $registrationData: RegistrationInput!) {
    requestRegistrationOTP(phoneNumber: $phoneNumber, registrationData: $registrationData) {
      success
      message
      sessionId
      expiresAt
    }
  }
`);

export const VERIFY_REGISTRATION_OTP = graphql(`
  mutation VerifyRegistrationOTP($phoneNumber: String!, $otp: String!, $sessionId: String!) {
    verifyRegistrationOTP(phoneNumber: $phoneNumber, otp: $otp, sessionId: $sessionId) {
      success
      userId
      message
    }
  }
`);

export const REQUEST_LOGIN_OTP = graphql(`
  mutation RequestLoginOTP($phoneNumber: String!) {
    requestLoginOTP(phoneNumber: $phoneNumber) {
      success
      message
      expiresAt
    }
  }
`);

export const VERIFY_LOGIN_OTP = graphql(`
  mutation VerifyLoginOTP($phoneNumber: String!, $otp: String!) {
    verifyLoginOTP(phoneNumber: $phoneNumber, otp: $otp) {
      success
      token
      user {
        id
        identifier
      }
      message
    }
  }
`);

export const CHECK_AUTHORIZATION_STATUS = graphql(`
  query CheckAuthorizationStatus($identifier: String!) {
    checkAuthorizationStatus(identifier: $identifier) {
      status
      message
    }
  }
`);

export const LOGOUT = graphql(`
  mutation Logout {
    logout {
      success
    }
  }
`);

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

export const GET_USER_CHANNELS = graphql(`
  query GetUserChannels {
    me {
      id
      identifier
      channels {
        id
        code
        token
      }
    }
  }
`);

export const GET_ACTIVE_CHANNEL = graphql(`
  query GetActiveChannel {
    activeChannel {
      id
      code
      token
      defaultCurrencyCode
      customFields {
        mlModelJsonAsset {
          id
          source
          name
        }
        mlModelBinAsset {
          id
          source
          name
        }
        mlMetadataAsset {
          id
          source
          name
        }
        companyLogoAsset {
          id
          source
          name
          preview
        }
        cashierFlowEnabled
        cashierOpen
        subscriptionStatus
        trialEndsAt
        subscriptionExpiresAt
      }
    }
  }
`);

// ============================================================================
// PRODUCT MANAGEMENT
// ============================================================================

export const GET_STOCK_LOCATIONS = graphql(`
  query GetStockLocations {
    stockLocations(options: { take: 100 }) {
      items {
        id
        name
        description
      }
    }
  }
`);

export const CHECK_SKU_EXISTS = graphql(`
  query CheckSkuExists($sku: String!) {
    productVariants(options: { filter: { sku: { eq: $sku } }, take: 1 }) {
      items {
        id
        sku
        product {
          id
          name
        }
      }
    }
  }
`);

export const CREATE_PRODUCT = graphql(`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
      slug
      description
      enabled
      featuredAsset {
        id
        preview
      }
      variants {
        id
        name
        sku
        price
        stockOnHand
                customFields {
                  wholesalePrice
                  allowFractionalQuantity
                }
      }
    }
  }
`);

export const CREATE_PRODUCT_VARIANTS = graphql(`
  mutation CreateProductVariants($input: [CreateProductVariantInput!]!) {
    createProductVariants(input: $input) {
      id
      name
      sku
      price
      priceWithTax
      stockOnHand
      product {
        id
        name
      }
    }
  }
`);

export const CREATE_ASSETS = graphql(`
  mutation CreateAssets($input: [CreateAssetInput!]!) {
    createAssets(input: $input) {
      ... on Asset {
        id
        name
        preview
        source
      }
    }
  }
`);

export const ASSIGN_ASSETS_TO_PRODUCT = graphql(`
  mutation AssignAssetsToProduct($productId: ID!, $assetIds: [ID!]!, $featuredAssetId: ID) {
    updateProduct(input: { id: $productId, assetIds: $assetIds, featuredAssetId: $featuredAssetId }) {
      id
      assets {
        id
        name
        preview
      }
      featuredAsset {
        id
        preview
      }
    }
  }
`);

export const DELETE_ASSET = graphql(`
  mutation DeleteAsset($input: DeleteAssetInput!) {
    deleteAsset(input: $input) {
      result
      message
    }
  }
`);

export const UPDATE_PRODUCT_ASSETS = graphql(`
  mutation UpdateProductAssets($productId: ID!, $assetIds: [ID!]!, $featuredAssetId: ID) {
    updateProduct(input: { id: $productId, assetIds: $assetIds, featuredAssetId: $featuredAssetId }) {
      id
      assets {
        id
        name
        preview
        source
      }
      featuredAsset {
        id
        preview
      }
    }
  }
`);

export const GET_PRODUCT_DETAIL = graphql(`
  query GetProductDetail($id: ID!) {
    product(id: $id) {
      id
      name
      slug
      description
      enabled
      assets {
        id
        name
        preview
        source
      }
      featuredAsset {
        id
        preview
      }
      variants {
        id
        name
        sku
        price
        priceWithTax
        stockOnHand
                customFields {
                  wholesalePrice
                  allowFractionalQuantity
                }
        prices {
          price
          currencyCode
        }
        stockLevels {
          id
          stockOnHand
          stockLocation {
            id
            name
          }
        }
      }
    }
  }
`);

export const GET_PRODUCTS = graphql(`
  query GetProducts($options: ProductListOptions) {
    products(options: $options) {
      totalItems
      items {
        id
        name
        slug
        description
        enabled
        featuredAsset {
          id
          preview
        }
        variants {
          id
          name
          sku
          price
          priceWithTax
          stockOnHand
                customFields {
                  wholesalePrice
                  allowFractionalQuantity
                }
          prices {
            price
            currencyCode
          }
        }
      }
    }
  }
`);

export const DELETE_PRODUCT = graphql(`
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id) {
      result
      message
    }
  }
`);

export const CREATE_PRODUCT_OPTION_GROUP = graphql(`
  mutation CreateProductOptionGroup($input: CreateProductOptionGroupInput!) {
    createProductOptionGroup(input: $input) {
      id
      code
      name
      options {
        id
        code
        name
      }
    }
  }
`);

export const CREATE_PRODUCT_OPTION = graphql(`
  mutation CreateProductOption($input: CreateProductOptionInput!) {
    createProductOption(input: $input) {
      id
      code
      name
      group {
        id
        name
      }
    }
  }
`);

export const ADD_OPTION_GROUP_TO_PRODUCT = graphql(`
  mutation AddOptionGroupToProduct($productId: ID!, $optionGroupId: ID!) {
    addOptionGroupToProduct(productId: $productId, optionGroupId: $optionGroupId) {
      id
      name
      optionGroups {
        id
        code
        name
        options {
          id
          code
          name
        }
      }
    }
  }
`);

export const UPDATE_PRODUCT_VARIANT = graphql(`
  mutation UpdateProductVariant($input: UpdateProductVariantInput!) {
    updateProductVariant(input: $input) {
      id
      name
      sku
      price
      priceWithTax
      stockOnHand
      product {
        id
        name
      }
    }
  }
`);

// ============================================================================
// PRODUCT SEARCH & CACHE (POS)
// ============================================================================

export const SEARCH_PRODUCTS = graphql(`
  query SearchProducts($term: String!) {
    products(options: { 
      filter: { 
        name: { contains: $term }
      },
      take: 5 
    }) {
      items {
        id
        name
        featuredAsset {
          preview
        }
        variants {
          id
          name
          sku
          price
          priceWithTax
          stockOnHand
                customFields {
                  wholesalePrice
                  allowFractionalQuantity
                }
          prices {
            price
            currencyCode
          }
        }
      }
    }
  }
`);

export const GET_PRODUCT = graphql(`
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      name
      featuredAsset {
        preview
      }
      variants {
        id
        name
        sku
        price
        priceWithTax
        prices {
          price
          currencyCode
        }
        stockLevels {
          stockLocationId
          stockOnHand
        }
      }
    }
  }
`);

export const SEARCH_BY_BARCODE = graphql(`
  query SearchByBarcode($sku: String!) {
    search(input: { term: $sku, take: 1 }) {
      items {
        productId
        productName
        productVariantId
        productVariantName
        sku
        priceWithTax {
          ... on SinglePrice {
            value
          }
        }
        productAsset {
          preview
        }
      }
    }
  }
`);

export const PREFETCH_PRODUCTS = graphql(`
  query PrefetchProducts($take: Int!) {
    products(options: { take: $take, skip: 0 }) {
      totalItems
      items {
        id
        name
        featuredAsset {
          preview
        }
        variants {
          id
          name
          sku
          price
          priceWithTax
          stockOnHand
                customFields {
                  wholesalePrice
                  allowFractionalQuantity
                }
          prices {
            price
            currencyCode
          }
        }
      }
    }
  }
`);

// ============================================================================
// DASHBOARD & ANALYTICS
// ============================================================================

export const GET_ORDERS_FOR_PERIOD = graphql(`
  query GetOrdersForPeriod($startDate: DateTime!) {
    orders(options: { 
      filter: { 
        orderPlacedAt: { after: $startDate }
      }
      take: 1000
    }) {
      items {
        id
        total
        totalWithTax
        orderPlacedAt
        state
      }
    }
  }
`);

export const GET_PRODUCT_STATS = graphql(`
  query GetProductStats {
    products(options: { take: 1 }) {
      totalItems
    }
    productVariants(options: { take: 1 }) {
      totalItems
    }
  }
`);

export const GET_RECENT_ORDERS = graphql(`
  query GetRecentOrders {
    orders(options: { take: 10, sort: { createdAt: DESC } }) {
      items {
        id
        code
        total
        totalWithTax
        state
        createdAt
        currencyCode
        lines {
          id
          productVariant {
            name
          }
          quantity
        }
      }
    }
  }
`);

// ============================================================================
// ORDER MANAGEMENT (Admin API)
// ============================================================================

export const CREATE_DRAFT_ORDER = graphql(`
  mutation CreateDraftOrder {
    createDraftOrder {
      id
      code
      state
      total
      totalWithTax
    }
  }
`);

export const ADD_ITEM_TO_DRAFT_ORDER = graphql(`
  mutation AddItemToDraftOrder($orderId: ID!, $input: AddItemToDraftOrderInput!) {
    addItemToDraftOrder(orderId: $orderId, input: $input) {
      ... on Order {
        id
        code
        state
        lines {
          id
          quantity
          linePrice
          linePriceWithTax
          productVariant {
            id
            name
          }
        }
      }
    }
  }
`);

export const ADD_MANUAL_PAYMENT_TO_ORDER = graphql(`
  mutation AddManualPaymentToOrder($input: ManualPaymentInput!) {
    addManualPaymentToOrder(input: $input) {
      ... on Order {
        id
        code
        state
        total
        totalWithTax
        payments {
          id
          state
          amount
          method
          metadata
        }
      }
      ... on ManualPaymentStateError {
        errorCode
        message
      }
    }
  }
`);

export const SET_CUSTOMER_FOR_DRAFT_ORDER = graphql(`
  mutation SetCustomerForDraftOrder($orderId: ID!, $customerId: ID!) {
    setCustomerForDraftOrder(orderId: $orderId, customerId: $customerId) {
      ... on Order {
        id
        code
        state
        total
        totalWithTax
        customer {
          id
          firstName
          lastName
          emailAddress
        }
      }
      ... on EmailAddressConflictError {
        errorCode
        message
      }
    }
  }
`);

export const SET_DRAFT_ORDER_SHIPPING_METHOD = graphql(`
  mutation SetDraftOrderShippingMethod($orderId: ID!, $shippingMethodId: ID!) {
    setDraftOrderShippingMethod(orderId: $orderId, shippingMethodId: $shippingMethodId) {
      ... on Order {
        id
        code
        state
        total
        totalWithTax
        shippingLines {
          id
          shippingMethod {
            id
            name
            code
          }
        }
      }
      ... on OrderModificationError {
        errorCode
        message
      }
    }
  }
`);

export const SET_DRAFT_ORDER_BILLING_ADDRESS = graphql(`
  mutation SetDraftOrderBillingAddress($orderId: ID!, $input: CreateAddressInput!) {
    setDraftOrderBillingAddress(orderId: $orderId, input: $input) {
      id
      code
      state
      total
      totalWithTax
      billingAddress {
        fullName
        streetLine1
        city
        postalCode
        country
      }
    }
  }
`);

export const SET_DRAFT_ORDER_SHIPPING_ADDRESS = graphql(`
  mutation SetDraftOrderShippingAddress($orderId: ID!, $input: CreateAddressInput!) {
    setDraftOrderShippingAddress(orderId: $orderId, input: $input) {
      id
      code
      state
      total
      totalWithTax
      shippingAddress {
        fullName
        streetLine1
        city
        postalCode
        country
      }
    }
  }
`);


export const TRANSITION_ORDER_TO_STATE = graphql(`
  mutation TransitionOrderToState($id: ID!, $state: String!) {
    transitionOrderToState(id: $id, state: $state) {
      ... on Order {
        id
        code
        state
        total
        totalWithTax
        lines {
          id
          quantity
          linePrice
          productVariant {
            id
            name
          }
        }
      }
      ... on OrderStateTransitionError {
        errorCode
        message
        transitionError
      }
    }
  }
`);

export const ADD_FULFILLMENT_TO_ORDER = graphql(`
  mutation AddFulfillmentToOrder($input: FulfillOrderInput!) {
    addFulfillmentToOrder(input: $input) {
      ... on Fulfillment {
        id
        state
        nextStates
        createdAt
        updatedAt
        method
        lines {
          orderLineId
          quantity
        }
        trackingCode
      }
      ... on CreateFulfillmentError {
        errorCode
        message
        fulfillmentHandlerError
      }
      ... on FulfillmentStateTransitionError {
        errorCode
        message
        transitionError
      }
    }
  }
`);

// Note: These payment operations are not yet implemented in the backend
// They are placeholders for future cashier flow implementation
// export const ADD_PAYMENT_TO_ORDER = graphql(`
//   mutation AddPaymentToOrder($input: AddPaymentToOrderInput!) {
//     addPaymentToOrder(input: $input) {
//       ... on Order {
//         id
//         code
//         state
//         total
//         totalWithTax
//         payments {
//           id
//           amount
//           state
//           method
//           transactionId
//         }
//       }
//       ... on PaymentFailedError {
//         paymentErrorMessage
//       }
//       ... on PaymentDeclinedError {
//         paymentErrorMessage
//       }
//       ... on IneligiblePaymentMethodError {
//         eligibilityCheckerMessage
//       }
//     }
//   }
// `);

// export const SETTLE_ORDER_PAYMENT = graphql(`
//   mutation SettleOrderPayment($orderId: ID!) {
//     settleOrderPayment(orderId: $orderId) {
//       ... on Order {
//         id
//         code
//         state
//         total
//         totalWithTax
//         payments {
//           id
//           amount
//           state
//           method
//           transactionId
//         }
//       }
//       ... on PaymentFailedError {
//         paymentErrorMessage
//       }
//       ... on PaymentSettlementError {
//         settlementErrorMessage
//       }
//     }
//   }
// `);

export const GET_PAYMENT_METHODS = graphql(`
  query GetPaymentMethods {
    paymentMethods(options: { take: 100 }) {
      items {
        id
        code
        name
        description
        enabled
        customFields {
          imageAsset {
            id
            source
            name
            preview
          }
          isActive
        }
      }
    }
  }
`);

export const GET_ORDER_DETAILS = graphql(`
  query GetOrderDetails($id: ID!) {
    order(id: $id) {
      id
      code
      state
      lines {
        id
        quantity
        productVariant {
          id
          name
          sku
        }
      }
    }
  }
`);


export const GET_ORDER = graphql(`
  query GetOrder($id: ID!) {
    order(id: $id) {
      id
      code
      state
      total
      totalWithTax
      lines {
        id
        quantity
        linePrice
        linePriceWithTax
        productVariant {
          id
          name
        }
      }
    }
  }
`);

export const GET_ORDERS = graphql(`
  query GetOrders($options: OrderListOptions) {
    orders(options: $options) {
      items {
        id
        code
        state
        createdAt
        updatedAt
        orderPlacedAt
        total
        totalWithTax
        currencyCode
        customer {
          id
          firstName
          lastName
          emailAddress
        }
        lines {
          id
          quantity
          linePrice
          linePriceWithTax
          productVariant {
            id
            name
            sku
          }
        }
        payments {
          id
          state
          amount
          method
          createdAt
        }
      }
      totalItems
    }
  }
`);

export const GET_ORDER_FULL = graphql(`
  query GetOrderFull($id: ID!) {
    order(id: $id) {
      id
      code
      state
      createdAt
      updatedAt
      orderPlacedAt
      total
      totalWithTax
      currencyCode
      customer {
        id
        firstName
        lastName
        emailAddress
        phoneNumber
      }
      lines {
        id
        quantity
        linePrice
        linePriceWithTax
        productVariant {
          id
          name
          sku
        }
      }
      payments {
        id
        state
        amount
        method
        createdAt
        metadata
      }
      fulfillments {
        id
        state
        method
        trackingCode
        createdAt
        updatedAt
      }
      billingAddress {
        fullName
        streetLine1
        streetLine2
        city
        postalCode
        province
        country {
          code
          name
        }
        phoneNumber
      }
      shippingAddress {
        fullName
        streetLine1
        streetLine2
        city
        postalCode
        province
        country {
          code
          name
        }
        phoneNumber
      }
      adjustments {
        adjustmentSource
        type
        description
        amount
      }
    }
  }
`);

// ============================================================================
// ML MODEL & TRAINING
// ============================================================================

// REMOVED: GET_ML_MODEL_ASSETS - No longer needed with Asset relationships
// The ML model assets are now fetched directly as part of the channel custom fields

export const GET_ML_TRAINING_INFO = graphql(`
  query GetMlTrainingInfo($channelId: ID!) {
    mlTrainingInfo(channelId: $channelId) {
      status
      progress
      startedAt
      error
      productCount
      imageCount
      hasActiveModel
      lastTrainedAt
    }
  }
`);

export const GET_ML_TRAINING_MANIFEST = graphql(`
  query GetMlTrainingManifest($channelId: ID!) {
    mlTrainingManifest(channelId: $channelId) {
      channelId
      version
      extractedAt
      products {
        productId
        productName
        images {
          assetId
          url
          filename
        }
      }
    }
  }
`);

export const EXTRACT_PHOTOS_FOR_TRAINING = graphql(`
  mutation ExtractPhotosForTraining($channelId: ID!) {
    extractPhotosForTraining(channelId: $channelId)
  }
`);

export const UPDATE_TRAINING_STATUS = graphql(`
  mutation UpdateTrainingStatus($channelId: ID!, $status: String!, $progress: Int, $error: String) {
    updateTrainingStatus(channelId: $channelId, status: $status, progress: $progress, error: $error)
  }
`);

export const COMPLETE_TRAINING = graphql(`
  mutation CompleteTraining($channelId: ID!, $modelJson: Upload!, $weightsFile: Upload!, $metadata: Upload!) {
    completeTraining(channelId: $channelId, modelJson: $modelJson, weightsFile: $weightsFile, metadata: $metadata)
  }
`);

// ============================================================================
// CUSTOMER MANAGEMENT
// ============================================================================

export const GET_CUSTOMERS = graphql(`
  query GetCustomers($options: CustomerListOptions) {
    customers(options: $options) {
      totalItems
      items {
        id
        firstName
        lastName
        emailAddress
        phoneNumber
        createdAt
        updatedAt
        customFields {
          isSupplier
          supplierType
          contactPerson
          taxId
          paymentTerms
          notes
          isCreditApproved
          creditLimit
          outstandingAmount
          lastRepaymentDate
          lastRepaymentAmount
          creditDuration
        }
        addresses {
          id
          fullName
          streetLine1
          streetLine2
          city
          postalCode
          country {
            code
            name
          }
          phoneNumber
        }
        user {
          id
          identifier
          verified
        }
      }
    }
  }
`);

export const GET_COUNTRIES = graphql(`
  query GetCountries($options: CountryListOptions) {
    countries(options: $options) {
      totalItems
      items {
        id
        code
        name
        enabled
      }
    }
  }
`);

export const GET_CUSTOMER = graphql(`
  query GetCustomer($id: ID!) {
    customer(id: $id) {
      id
      firstName
      lastName
      emailAddress
      phoneNumber
      createdAt
      updatedAt
      customFields {
        isSupplier
        supplierType
        contactPerson
        taxId
        paymentTerms
        notes
        outstandingAmount
      }
      addresses {
        id
        fullName
        streetLine1
        streetLine2
        city
        postalCode
        country {
          code
          name
        }
        phoneNumber
      }
      user {
        id
        identifier
        verified
      }
    }
  }
`);

export const CREATE_CUSTOMER = graphql(`
  mutation CreateCustomer($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      ... on Customer {
        id
        firstName
        lastName
        emailAddress
        phoneNumber
        createdAt
        customFields {
          isSupplier
          supplierType
          contactPerson
          taxId
          paymentTerms
          notes
          isCreditApproved
          creditLimit
          outstandingAmount
        }
      }
      ... on EmailAddressConflictError {
        errorCode
        message
      }
    }
  }
`);

export const UPDATE_CUSTOMER = graphql(`
  mutation UpdateCustomer($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      ... on Customer {
        id
        firstName
        lastName
        emailAddress
        phoneNumber
        updatedAt
        customFields {
          isSupplier
          supplierType
          contactPerson
          taxId
          paymentTerms
          notes
          isCreditApproved
          creditLimit
          outstandingAmount
        }
      }
      ... on EmailAddressConflictError {
        errorCode
        message
      }
    }
  }
`);

export const DELETE_CUSTOMER = graphql(`
  mutation DeleteCustomer($id: ID!) {
    deleteCustomer(id: $id) {
      result
      message
    }
  }
`);

export const CREATE_CUSTOMER_ADDRESS = graphql(`
  mutation CreateCustomerAddress($customerId: ID!, $input: CreateAddressInput!) {
    createCustomerAddress(customerId: $customerId, input: $input) {
      id
      fullName
      streetLine1
      streetLine2
      city
      postalCode
      country {
        code
        name
      }
      phoneNumber
    }
  }
`);

export const UPDATE_CUSTOMER_ADDRESS = graphql(`
  mutation UpdateCustomerAddress($input: UpdateAddressInput!) {
    updateCustomerAddress(input: $input) {
      id
      fullName
      streetLine1
      streetLine2
      city
      postalCode
      country {
        code
        name
      }
      phoneNumber
    }
  }
`);

export const DELETE_CUSTOMER_ADDRESS = graphql(`
  mutation DeleteCustomerAddress($id: ID!) {
    deleteCustomerAddress(id: $id) {
      success
    }
  }
`);

// ============================================================================
// CREDIT MANAGEMENT
// ============================================================================

export const GET_CREDIT_SUMMARY = graphql(`
  query GetCreditSummary($customerId: ID!) {
    creditSummary(customerId: $customerId) {
      customerId
      isCreditApproved
      creditLimit
      outstandingAmount
      availableCredit
      lastRepaymentDate
      lastRepaymentAmount
      creditDuration
    }
  }
`);

export const APPROVE_CUSTOMER_CREDIT = graphql(`
  mutation ApproveCustomerCredit($input: ApproveCustomerCreditInput!) {
    approveCustomerCredit(input: $input) {
      customerId
      isCreditApproved
      creditLimit
      outstandingAmount
      availableCredit
      lastRepaymentDate
      lastRepaymentAmount
      creditDuration
    }
  }
`);

export const UPDATE_CUSTOMER_CREDIT_LIMIT = graphql(`
  mutation UpdateCustomerCreditLimit($input: UpdateCustomerCreditLimitInput!) {
    updateCustomerCreditLimit(input: $input) {
      customerId
      isCreditApproved
      creditLimit
      outstandingAmount
      availableCredit
      lastRepaymentDate
      lastRepaymentAmount
      creditDuration
    }
  }
`);

export const UPDATE_CREDIT_DURATION = graphql(`
  mutation UpdateCreditDuration($input: UpdateCreditDurationInput!) {
    updateCreditDuration(input: $input) {
      customerId
      isCreditApproved
      creditLimit
      outstandingAmount
      availableCredit
      lastRepaymentDate
      lastRepaymentAmount
      creditDuration
    }
  }
`);

// ============================================================================
// PRICE OVERRIDE OPERATIONS
// ============================================================================

export const SET_ORDER_LINE_CUSTOM_PRICE = graphql(`
  mutation SetOrderLineCustomPrice($input: SetOrderLineCustomPriceInput!) {
    setOrderLineCustomPrice(input: $input) {
      ... on OrderLine {
        id
        quantity
        linePrice
        linePriceWithTax
        customFields {
          customLinePrice
          priceOverrideReason
        }
        productVariant {
          id
          name
          price
        }
      }
      ... on Error {
        errorCode
        message
      }
    }
  }
`);


// ============================================================================
// SUPPLIER MANAGEMENT (Custom Fields)
// ============================================================================

export const GET_SUPPLIERS = graphql(`
  query GetSuppliers($options: CustomerListOptions) {
    customers(options: $options) {
      totalItems
      items {
        id
        firstName
        lastName
        emailAddress
        phoneNumber
        createdAt
        updatedAt
        customFields {
          isSupplier
          supplierType
          contactPerson
          taxId
          paymentTerms
          notes
          isCreditApproved
          creditLimit
          outstandingAmount
        }
        addresses {
          id
          fullName
          streetLine1
          streetLine2
          city
          postalCode
          country {
            code
            name
          }
          phoneNumber
        }
      }
    }
  }
`);

export const GET_SUPPLIER = graphql(`
  query GetSupplier($id: ID!) {
    customer(id: $id) {
      id
      firstName
      lastName
      emailAddress
      phoneNumber
      createdAt
      updatedAt
      customFields {
        isSupplier
        supplierType
        contactPerson
        taxId
        paymentTerms
        notes
        isCreditApproved
        creditLimit
        outstandingAmount
        lastRepaymentDate
        lastRepaymentAmount
        creditDuration
      }
      addresses {
        id
        fullName
        streetLine1
        streetLine2
        city
        postalCode
        country {
          code
          name
        }
        phoneNumber
      }
    }
  }
`);

export const CREATE_SUPPLIER = graphql(`
  mutation CreateSupplier($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      ... on Customer {
        id
        firstName
        lastName
        emailAddress
        phoneNumber
        createdAt
        customFields {
          isSupplier
          supplierType
          contactPerson
          taxId
          paymentTerms
          notes
          isCreditApproved
          creditLimit
          outstandingAmount
        }
      }
      ... on EmailAddressConflictError {
        errorCode
        message
      }
    }
  }
`);

export const UPDATE_SUPPLIER = graphql(`
  mutation UpdateSupplier($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      ... on Customer {
        id
        firstName
        lastName
        emailAddress
        phoneNumber
        updatedAt
        customFields {
          isSupplier
          supplierType
          contactPerson
          taxId
          paymentTerms
          notes
          outstandingAmount
        }
      }
      ... on EmailAddressConflictError {
        errorCode
        message
      }
    }
  }
`);

export const DELETE_SUPPLIER = graphql(`
  mutation DeleteSupplier($id: ID!) {
    deleteCustomer(id: $id) {
      result
      message
    }
  }
`);

export const UPDATE_CHANNEL_SETTINGS = graphql(`
  mutation UpdateChannelSettings($input: UpdateChannelSettingsInput!) {
    updateChannelSettings(input: $input) {
      cashierFlowEnabled
      cashierOpen
      companyLogoAsset {
        id
        source
        preview
      }
    }
  }
`);

export const INVITE_CHANNEL_ADMINISTRATOR = graphql(`
  mutation InviteChannelAdministrator($input: InviteAdministratorInput!) {
    inviteChannelAdministrator(input: $input) {
      id
      firstName
      lastName
      emailAddress
    }
  }
`);

export const GET_ADMINISTRATORS = graphql(`
  query GetAdministrators($options: AdministratorListOptions) {
    administrators(options: $options) {
      items {
        id
        firstName
        lastName
        emailAddress
        user {
          id
          identifier
          verified
          roles {
            id
            code
            channels {
              id
            }
          }
        }
      }
    }
  }
`);

export const CREATE_CHANNEL_PAYMENT_METHOD = graphql(`
  mutation CreateChannelPaymentMethod($input: CreatePaymentMethodInput!) {
    createChannelPaymentMethod(input: $input) {
      id
      code
      name
    }
  }
`);

export const UPDATE_CHANNEL_PAYMENT_METHOD = graphql(`
  mutation UpdateChannelPaymentMethod($input: UpdatePaymentMethodInput!) {
    updateChannelPaymentMethod(input: $input) {
      id
      code
      name
      customFields {
        imageAsset {
          id
          preview
        }
        isActive
      }
    }
  }
`);

export const GET_AUDIT_LOGS = graphql(`
  query GetAuditLogs($options: AuditLogOptions) {
    auditLogs(options: $options) {
      id
      timestamp
      channelId
      eventType
      entityType
      entityId
      userId
      data
      source
    }
  }
`);


// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const GET_USER_NOTIFICATIONS = graphql(`
  query GetUserNotifications($options: NotificationListOptions) {
    getUserNotifications(options: $options) {
      items {
        id
        userId
        channelId
        type
        title
        message
        data
        read
        createdAt
      }
      totalItems
    }
  }
`);

export const GET_UNREAD_COUNT = graphql(`
  query GetUnreadCount {
    getUnreadCount
  }
`);

export const MARK_NOTIFICATION_AS_READ = graphql(`
  mutation MarkNotificationAsRead($id: ID!) {
    markNotificationAsRead(id: $id)
  }
`);

export const MARK_ALL_AS_READ = graphql(`
  mutation MarkAllAsRead {
    markAllAsRead
  }
`);

export const SUBSCRIBE_TO_PUSH = graphql(`
  mutation SubscribeToPush($subscription: PushSubscriptionInput!) {
    subscribeToPush(subscription: $subscription)
  }
`);

export const UNSUBSCRIBE_TO_PUSH = graphql(`
  mutation UnsubscribeToPush {
    unsubscribeToPush
  }
`);

// ============================================================================
// SUBSCRIPTION & PAYMENT
// ============================================================================

export const GET_SUBSCRIPTION_TIERS = graphql(`
  query GetSubscriptionTiers {
    getSubscriptionTiers {
      id
      code
      name
      description
      priceMonthly
      priceYearly
      features
      isActive
      createdAt
      updatedAt
    }
  }
`);

export const GET_CHANNEL_SUBSCRIPTION = graphql(`
  query GetChannelSubscription($channelId: ID) {
    getChannelSubscription(channelId: $channelId) {
      tier {
        id
        code
        name
        description
        priceMonthly
        priceYearly
        features
      }
      status
      trialEndsAt
      subscriptionStartedAt
      subscriptionExpiresAt
      billingCycle
      lastPaymentDate
      lastPaymentAmount
    }
  }
`);

export const CHECK_SUBSCRIPTION_STATUS = graphql(`
  query CheckSubscriptionStatus($channelId: ID) {
    checkSubscriptionStatus(channelId: $channelId) {
      isValid
      status
      daysRemaining
      expiresAt
      trialEndsAt
      canPerformAction
    }
  }
`);

export const INITIATE_SUBSCRIPTION_PURCHASE = graphql(`
  mutation InitiateSubscriptionPurchase(
    $channelId: ID!
    $tierId: ID!
    $billingCycle: String!
    $phoneNumber: String!
    $email: String!
  ) {
    initiateSubscriptionPurchase(
      channelId: $channelId
      tierId: $tierId
      billingCycle: $billingCycle
      phoneNumber: $phoneNumber
      email: $email
    ) {
      success
      reference
      authorizationUrl
      message
    }
  }
`);

export const VERIFY_SUBSCRIPTION_PAYMENT = graphql(`
  mutation VerifySubscriptionPayment($channelId: ID!, $reference: String!) {
    verifySubscriptionPayment(channelId: $channelId, reference: $reference)
  }
`);

export const CANCEL_SUBSCRIPTION = graphql(`
  mutation CancelSubscription($channelId: ID!) {
    cancelSubscription(channelId: $channelId)
  }
`);
