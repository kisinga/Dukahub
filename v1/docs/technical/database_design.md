Logic Flow: Product Creation to Sale and Reordering

Here's the typical lifecycle within this structure:

    Setup (One-time or infrequent):
        Define companies (HQ, branches).
        Define product_categories.
        Define base products.
        Define skus for each product variation.
        Create partners for known Suppliers.
        Set up company_accounts (Cash, Bank).

    Purchasing / Initial Stocking:
        A user logs in (associated with a company).
        Create a purchase record for each sku being bought from a partner (Supplier).
        Associate these purchase records with an invoice (type='purchase') received from the supplier.
        Record a payment: Create a transaction (type='debit') against a company_account, linking it to the purchase invoice (reference_type='purchase', reference_id=invoice.id). Update the invoice status and balance. Update the partner (supplier) balance. Update the company_account balance.
        Update Inventory: For each purchase line item, create an inventory_transaction (reason_code='purchase', quantity_change=positive value, reference_id=purchase.id, reference_type='purchases').
        Create/Update the corresponding inventory record for the sku at the company, setting cost_price, retail_price, reorder_point, and updating current_quantity.

    Selling a Product:
        A user (salesperson) logs in.
        Create a sales_transaction record, linking the salesperson and company. Optionally link a partner (customer).
        For each item being sold:
            Create a sales_details record, linking it to the sales_transaction. Specify the product, sku, quantity, and capture the unit_price from the inventory record (or apply discounts).
        Calculate the total_amount for the sales_transaction.
        Generate an invoice (type='sale') linked to the sales_transaction and partner (customer, if any).
        Record Payment: Create a transaction (type='credit') against a company_account (e.g., Cash Drawer), linking it to the sales invoice (reference_type='sale', reference_id=invoice.id). Update the invoice status/balance. Update the partner (customer) balance if applicable. Update the company_account balance.
        Update Inventory: For each sales_details line item, create an inventory_transaction (reason_code='sale', quantity_change=negative value, reference_id=sales_transaction.id, reference_type='sales_transactions'). Update the current_quantity in the corresponding inventory record.

    Reordering:
        Periodically (or via triggers), check inventory records.
        If current_quantity <= reorder_point for any sku at a company, flag it for reordering.
        Initiate the Purchasing flow (Step 2) for the flagged items.

    Handling Expenses:
        A user records an expense.
        Create an expense record detailing the amount and purpose.
        Record the payment: Create a transaction (type='debit') against a company_account, linking it to the expense record (reference_type='expense', reference_id=expense.id). Update the company_account balance.
