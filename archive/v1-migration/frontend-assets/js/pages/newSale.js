// Import store logic
import modalStoreLogic from '../stores/modalStore.js';
import saleStoreLogic from '../stores/saleStore.js';
import scannerStoreLogic from '../stores/scannerStore.js';

// Import component logic
import creditModalComponentLogic from '../components/creditModalComponent.js'; // Import Credit Modal
import newSaleComponentLogic from '../components/newSaleComponent.js';
// Import dependencies needed by stores/components if not relying on global
// import { DbService } from "/public/js/pb.js"; // DbService is imported within files now

// Note: Assumes Alpine is loaded globally via CDN script tag

document.addEventListener('alpine:init', () => {
  console.log('Alpine initializing: Registering stores and component...');

  // Register Stores using imported logic
  Alpine.store('sale', saleStoreLogic);
  Alpine.store('scanner', scannerStoreLogic);
  Alpine.store('modal', modalStoreLogic);

  // Register Component Data function
  Alpine.data('newSale', newSaleComponentLogic);
  Alpine.data('creditModal', creditModalComponentLogic); // Register Credit Modal

  console.log('Alpine stores and newSale component registered.');
});
