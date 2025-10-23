# Vendure Custom Fields Important Caveat

## **Known Issue: Relational Custom Fields Only**

### **Problem Description**

When an entity has **only relational custom fields** (e.g., only `type: 'relation'` fields), Vendure automatically adds a workaround column called `customFields__fix_relational_custom_fields__` to prevent certain database issues.

This can cause:

- Database schema mismatches
- Column not found errors
- Migration conflicts
- Unexpected database structure

### **Error Example**

```
column paymentmethod.customFields__fix_relational_custom_fields__ does not exist
QueryFailedError: column paymentmethod.customFields__fix_relational_custom_fields__ does not exist
```

### **Root Cause**

Vendure requires **at least one non-relational custom field** when an entity has relational custom fields. This is a Vendure framework limitation, not a bug.

### **Solution: Add Non-Relational Field**

Always include at least one non-relational custom field when using relational custom fields:

```typescript
// ❌ PROBLEMATIC - Only relational fields
PaymentMethod: [
  {
    name: "imageAsset",
    type: "relation",
    entity: Asset,
    // ... other config
  },
];

// ✅ CORRECT - Include non-relational field
PaymentMethod: [
  {
    name: "imageAsset",
    type: "relation",
    entity: Asset,
    // ... other config
  },
  {
    name: "isActive", // Non-relational field
    type: "boolean",
    // ... other config
  },
];
```

### **Recommended Non-Relational Field Types**

- **`boolean`**: Simple true/false values
- **`int`**: Numeric values
- **`string`**: Text values
- **`datetime`**: Date/time values

### **Examples of Good Non-Relational Fields**

```typescript
// Simple boolean
{
    name: 'isActive',
    type: 'boolean',
    defaultValue: true,
}

// Display order
{
    name: 'sortOrder',
    type: 'int',
    defaultValue: 0,
}

// Status field
{
    name: 'status',
    type: 'string',
    defaultValue: 'active',
}
```

### **Migration Strategy**

When adding relational custom fields to an entity that previously had none:

1. **Add the relational field(s)**
2. **Add at least one non-relational field**
3. **Create migration for both**
4. **Test thoroughly**

### **Prevention Checklist**

- [ ] Entity has relational custom fields
- [ ] Entity has at least one non-relational custom field
- [ ] Migration includes both field types
- [ ] Test with fresh database setup
- [ ] Verify no workaround columns are created

### **Troubleshooting**

If you encounter the workaround column error:

1. **Check entity configuration** - ensure non-relational field exists
2. **Run migrations** - apply schema changes
3. **Restart backend** - clear any cached references
4. **Verify database schema** - check column names match expectations

### **Best Practices**

1. **Always include non-relational fields** when using relational ones
2. **Use meaningful field names** (not just workarounds)
3. **Set appropriate defaults** for non-relational fields
4. **Document the purpose** of non-relational fields
5. **Test migrations** on fresh setups

### **Related Documentation**

- [Vendure Custom Fields Documentation](https://docs.vendure.io/guides/developer-guide/custom-fields/)
- [Vendure Migration Guide](https://docs.vendure.io/guides/developer-guide/migrations/)
- [TypeORM Custom Fields](https://typeorm.io/custom-fields)

---

**Note**: This is a known Vendure framework limitation, not a bug. Always plan for non-relational fields when designing custom field schemas.
