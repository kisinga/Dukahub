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

