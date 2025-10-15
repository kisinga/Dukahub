import { graphql } from './generated/gql';

/**
 * GraphQL operations for product management
 * 
 * ARCHITECTURE NOTES:
 * - Products belong to channels (multi-tenant)
 * - Each variant has stock levels per stock location
 * - SKU is at the variant level, not product level
 * - Prices are stored in cents (multiply by 100 before sending)
 */

/**
 * Query to get all stock locations
 * Used in product creation to select where stock will be stored
 */
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

/**
 * Query to get all stock locations with cashier status
 * Used to check if cashier is open at each location
 */
export const GET_STOCK_LOCATIONS_WITH_CASHIER = graphql(`
  query GetStockLocationsWithCashier {
    stockLocations(options: { take: 100 }) {
      items {
        id
        name
        description
        customFields {
          cashierOpen
        }
      }
    }
  }
`);

/**
 * Mutation to create a new product
 * Returns the created product with basic fields
 */
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
        priceWithTax
        stockOnHand
      }
    }
  }
`);

/**
 * Mutation to create product variants (SKUs)
 * Each product can have multiple variants with different SKUs, prices, and stock
 */
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

/**
 * Mutation to update stock levels for a variant at a specific location
 * Used after creating variants to set initial stock
 */
export const UPDATE_STOCK = graphql(`
  mutation UpdateStock($input: [UpdateProductVariantInput!]!) {
    updateProductVariants(input: $input) {
      id
      sku
      stockOnHand
      stockAllocated
      stockLevels {
        id
        stockOnHand
        stockAllocated
        stockLocation {
          id
          name
        }
      }
    }
  }
`);

/**
 * Query to get a single product with all its variants
 * Used after creation to verify the product was created correctly
 */
export const GET_PRODUCT_DETAIL = graphql(`
  query GetProductDetail($id: ID!) {
    product(id: $id) {
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

/**
 * Query to check if a SKU already exists
 * Used for validation before creating variants
 */
export const CHECK_SKU_EXISTS = graphql(`
  query CheckSKUExists($sku: String!) {
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

/**
 * Query to get all product option groups with their options
 * Used for displaying available option groups during product creation
 */
export const GET_PRODUCT_OPTION_GROUPS = graphql(`
  query GetProductOptionGroups {
    productOptionGroups {
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

/**
 * Mutation to create a new product option group
 * Useful for adding custom option groups like "Weight", "Size", etc.
 */
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

/**
 * Mutation to create a new product option within an existing option group
 * Example: Adding "2kg" to the "Weight" option group
 */
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

/**
 * Mutation to add an option group to a product
 * This must be done before creating variants that use those options
 */
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

/**
 * Query to get all products with pagination
 * Used for displaying products in the products list page
 */
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
        }
      }
    }
  }
`);

