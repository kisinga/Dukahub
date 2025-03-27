# Revision 0

<del> - Ease of use: The system relies on opening and closing cash register for daily record reconcilliation
<del>
The system is targeted at SME's in kenya who need an easy no-fuss accounting system. It does not enforce strict accounting principles that rely on microtransactions. Instead, it builds upon a system of trust while giving insights that help easily detect theft and or losses. The basis premise is this: A business has 1-5 employees(maybe more?) who are in charge of sales. Each employee has the ability to record micro-transactions. There are premission levels for companies with more than 1 employee, at the moment capped to 5 user levels. Every day, the store owner (permissions can be cascaded downwards if need be) records opening balances of ALL Accounts and ALL Stock items. This is done by recording the amount of cash in the cash register, the amount of stock in the store, the amount of money owed to the store by customers and pending invoices (money the store owes suppliers). The system then allows for recording of sales, purchases, and expenses.
</del>
<del>
As a support framework allowing good accounting, the system allows micro-transactions, aloowing for fine-grained recording of sales.
The system manages purchasing of stock items using custom SKU's as well as auto-conversion of SKU's using a conversion factor for products with custom SKU's.
It also manages customers and suppliers, grouped together as "partners" and allows purchasing/selling on credit. These can be tracked at the micro-transaction level. This is part the main premise of the system, that it allows easy monitoring of creditors and debtors, so we expect to see more invoices and purchase orders than cash sales.
<del>
</del>
My stack is go for the backend, angular for frontend and tailwind with daisyui for styling.

</del>

# Revision 1

This project is designed to transform SME record-keeping and sales tracking by leveraging **edge computing on smartphones** to create an **AI-powered point-of-sale (POS) system**. Instead of relying on traditional barcode scanners or manual input, shopkeepers can **use their phone camera to recognize products and services in real time**. The system prioritizes performance and efficiency by utilizing **TensorFlow.js with WebAssembly (WASM) for real-time image processing** within a web app, ensuring smooth operation even on mid-range devices. Each shop maintains its own **custom AI model**, which is downloaded, cached, and only updated when new products or services are introduced. This ensures that transactions remain fast and reliable without requiring constant internet connectivity.

To improve accuracy and speed, the system first attempts to **detect barcodes** before falling back to AI-based image recognition. This hybrid approach ensures that products with standard barcodes are instantly recognized, while unique or locally packaged goods can still be identified using the AI model. The system is highly flexible, allowing businesses to **train their model on any stock they sell**, from fresh produce to electronics. It even supports **services** by enabling shopkeepers to use **custom symbols or printed images**—for example, a small label reading _shoulder massage_ or a printed image of a person providing the service could serve as the identifier. This broadens the scope of the system beyond retail to include salons, repair shops, and other service-based businesses.

The goal is to **eliminate manual transaction logging while leveraging already available hardware**—smartphones—so that even small-scale businesses can benefit from AI without additional costs. The **AI training process is designed to be simple and intuitive**, allowing any user to **take pictures of their products, assign labels, and instantly use the model** for transactions. The initial web app will serve as a foundation for later enhancements, such as native mobile apps for better offline functionality and performance optimizations. **Would you like to explore the implementation details for model training, caching, or the barcode-first detection approach?**

# Dumbed down version

This project aims to revolutionize how SMEs manage sales and inventory by leveraging AI-powered image recognition for seamless point-of-sale (POS) transactions. Instead of manually entering product details, shopkeepers can simply point their smartphone camera at items, allowing the system to instantly recognize products, log sales, and update stock records. By making AI training as easy as taking a picture, shop owners can teach the system to recognize their unique inventory in minutes, ensuring high accuracy even with local product variations. Designed for ease of use, the solution works on low-end smartphones, functions offline, and integrates with existing payment systems like M-Pesa, making it accessible to a wide range of businesses.

Beyond simplifying transactions, this AI-powered POS provides valuable insights into sales trends, stock levels, and potential losses, helping shopkeepers make smarter business decisions. The platform also includes a trust-based record-keeping system to track credit transactions and detect potential theft. With a freemium pricing model, businesses can start for free and scale as needed, ensuring affordability for small retailers. By combining cutting-edge AI with an intuitive mobile experience, this solution empowers SMEs to digitize operations effortlessly, reduce errors, and improve financial transparency—all without the complexity of traditional accounting systems.

# Really dumbed down version

This project is about making it super easy for small shops to keep track of what they sell. Instead of typing in product names or using complicated machines, shopkeepers can just point their phone camera at items, and the system will recognize them right away. This means they can quickly log sales and see how much stock they have left.
The system is designed to be user-friendly, so even if a shop has unique products, the owner can teach the system to recognize them in just a few minutes. It works well on basic smartphones and doesn't need the internet all the time. Plus, it can connect with popular payment methods like M-Pesa, making it easy for shopkeepers to use.
