// Add product to the sale (keeping your existing code)
export const addProduct = (code) => {
  // In a real app, you'd look up the product details from a database
  // For demo purposes, we'll create some sample data
  const products = {
    123456: { name: "Coffee Mug", price: 12.99 },
    234567: { name: "T-Shirt", price: 24.99 },
    345678: { name: "Notebook", price: 8.5 },
  };

  // Use the entered code or a sample code if not found
  const productCode = code || productInput.value.trim();

  // Handle detected products
  if (productCode.startsWith("tm_")) {
    const labelIndex = parseInt(productCode.split("_")[1]);
    const productName =
      modelLabels[labelIndex] || `Unknown Product (${labelIndex})`;
    const product = { name: productName, price: 9.99 };

    // Clear "no items" row if present
    if (saleItems.querySelector('tr td[colspan="4"]')) {
      saleItems.innerHTML = "";
    }

    // Add product row
    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${product.name}</td>
        <td class="text-center">1</td>
        <td class="text-end">$${product.price.toFixed(2)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger remove-item">
            <i class="bi bi-x"></i>
          </button>
        </td>
      `;
    saleItems.appendChild(row);

    // Update totals
    updateTotals();
    return;
  }

  // Regular product lookup
  const product = products[productCode] || {
    name: `Product ${productCode}`,
    price: 9.99,
  };

  // Clear "no items" row if present
  if (saleItems.querySelector('tr td[colspan="4"]')) {
    saleItems.innerHTML = "";
  }

  // Add product row
  const row = document.createElement("tr");
  row.innerHTML = `
      <td>${product.name}</td>
      <td class="text-center">1</td>
      <td class="text-end">$${product.price.toFixed(2)}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-danger remove-item">
          <i class="bi bi-x"></i>
        </button>
      </td>
    `;
  saleItems.appendChild(row);

  // Update totals
  updateTotals();

  // Clear input
  productInput.value = "";
  productInput.focus();
};

// Update sale totals
const updateTotals = () => {
  const items = saleItems.querySelectorAll("tr:not([colspan])");
  itemCount.textContent = items.length;

  // Calculate subtotal
  let subTotal = 0;
  items.forEach((item) => {
    const priceText = item.querySelector("td:nth-child(3)").textContent;
    const price = parseFloat(priceText.replace("$", ""));
    subTotal += price;
  });

  // Update display
  subtotal.textContent = `$${subTotal.toFixed(2)}`;

  const taxAmount = subTotal * 0.1;
  tax.textContent = `$${taxAmount.toFixed(2)}`;

  const totalAmount = subTotal + taxAmount;
  total.textContent = `$${totalAmount.toFixed(2)}`;

  // Enable checkout button if we have items
  checkoutBtn.disabled = items.length === 0;
};
