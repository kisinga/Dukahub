- Ease of use: The system relies on opening and closing cash register for daily record reconcilliation

The system is targeted at SME's in kenya who need an easy no-fuss accounting system. It does not enforce strict accounting principles that rely on microtransactions. Instead, it builds upon a system of trust while giving insights that help easily detect theft and or losses. The basis premise is this: A business has 1-5 employees(maybe more?) who are in charge of sales. Each employee has the ability to record micro-transactions. There are premission levels for companies with more than 1 employee, at the moment capped to 5 user levels. Every day, the store owner (permissions can be cascaded downwards if need be) records opening balances of ALL Accounts and ALL Stock items. This is done by recording the amount of cash in the cash register, the amount of stock in the store, the amount of money owed to the store by customers and pending invoices (money the store owes suppliers). The system then allows for recording of sales, purchases, and expenses.

As a support framework allowing good accounting, the system allows micro-transactions, aloowing for fine-grained recording of sales.
The system manages purchasing of stock items using custom SKU's as well as auto-conversion of SKU's using a conversion factor for products with custom SKU's.
It also manages customers and suppliers, grouped together as "partners" and allows purchasing/selling on credit. These can be tracked at the micro-transaction level. This is part the main premise of the system, that it allows easy monitoring of creditors and debtors, so we expect to see more invoices and purchase orders than cash sales.

My stack is go for the backend, angular for frontend and tailwind with daisyui for styling.
