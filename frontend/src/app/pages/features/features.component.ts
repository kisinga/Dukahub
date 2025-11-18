import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../core/layout/footer/footer.component';
import { NavbarComponent } from '../../core/layout/navbar/navbar.component';

interface Feature {
  title: string;
  description: string;
  icon: string;
  origin: 'Dukahub-Exclusive' | 'Dukahub-Enhanced' | 'Standard';
  useCase?: string;
  visualPlaceholder?: string;
}

interface FeatureCategory {
  name: string;
  description: string;
  features: Feature[];
}

interface ComingSoonFeature {
  icon: string;
  title: string;
  description: string;
  category: string;
}

@Component({
  selector: 'app-features',
  imports: [RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './features.component.html',
  styleUrl: './features.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeaturesComponent {
  protected readonly categories: FeatureCategory[] = [
    {
      name: 'Selling & Checkout',
      description: 'Everything you need to sell quickly and accurately',
      features: [
        {
          title: 'Point Your Phone, Sell Instantly',
          description: 'Point your phone camera at a price label or product. Dukahub recognizes it instantly and adds it to your cart. No typing, no barcode scanner needed. Perfect for fresh produce, services, and items without barcodes.',
          icon: '📷',
          origin: 'Dukahub-Exclusive',
          useCase: 'Perfect for markets, salons, and shops selling items without barcodes'
        },
        {
          title: 'Barcode Scanning',
          description: 'Scan barcodes to quickly add packaged goods to your cart or create new products. Fast and accurate for items with barcodes.',
          icon: '📊',
          origin: 'Dukahub-Enhanced',
          useCase: 'Ideal for packaged goods and products with barcodes'
        },
        {
          title: 'Works Without Internet',
          description: 'Continue selling even when internet is down. Record up to 30 sales offline. Everything syncs automatically when you reconnect. Never lose a sale.',
          icon: '📡',
          origin: 'Dukahub-Exclusive',
          useCase: 'Essential for areas with unreliable internet or during power cuts'
        },
        {
          title: 'Accept Cash and M-Pesa',
          description: 'Take payments via cash and M-Pesa in one system. Everything is tracked automatically in your books. No need for separate payment systems.',
          icon: '💳',
          origin: 'Dukahub-Exclusive',
          useCase: 'Perfect for Kenyan businesses accepting both cash and mobile money'
        },
        {
          title: 'Sell Services Too',
          description: 'Create visual cards for services like haircuts or repairs. Track service sales just like products. No need for separate systems.',
          icon: '✂️',
          origin: 'Standard',
          useCase: 'Ideal for salons, barbers, repair shops, and service businesses'
        }
      ]
    },
    {
      name: 'Inventory & Stock',
      description: 'Know exactly what you have, where it is, and when to reorder',
      features: [
        {
          title: 'Real-time Stock Tracking',
          description: 'See exactly how much stock you have at any moment. Every sale updates your inventory instantly. No more guessing or manual counting.',
          icon: '📦',
          origin: 'Dukahub-Enhanced',
          useCase: 'Essential for any business that manages inventory'
        },
        {
          title: 'Multiple Stock Locations',
          description: 'Track inventory across multiple shops or warehouses. See what\'s where at a glance. Perfect for businesses with multiple locations.',
          icon: '🏪',
          origin: 'Standard',
          useCase: 'Perfect for businesses with multiple shops or warehouses'
        },
        {
          title: 'Stock Adjustments',
          description: 'Easily adjust stock levels when needed. Record damages, losses, or corrections. Everything is tracked with a clear audit trail.',
          icon: '📝',
          origin: 'Dukahub-Enhanced',
          useCase: 'Ideal when you need to correct stock counts or record losses'
        },
        {
          title: 'Low Stock Alerts',
          description: 'Get notified when items are running low. Never run out of popular items. Make better decisions about what to order.',
          icon: '🔔',
          origin: 'Dukahub-Exclusive',
          useCase: 'Perfect for preventing stockouts and reducing waste'
        }
      ]
    },
    {
      name: 'Customers & Suppliers',
      description: 'Manage everyone you do business with in one place',
      features: [
        {
          title: 'One System for Customers and Suppliers',
          description: 'Track customers and suppliers in the same system. No need for separate lists. See everything in one place.',
          icon: '👥',
          origin: 'Dukahub-Exclusive',
          useCase: 'Simplifies operations for businesses dealing with both customers and suppliers'
        },
        {
          title: 'Track Credit and Limits',
          description: 'Set credit limits for customers. The system automatically checks limits before allowing credit sales. Prevent bad debt.',
          icon: '💳',
          origin: 'Dukahub-Exclusive',
          useCase: 'Essential for businesses that sell on credit'
        },
        {
          title: 'Automatic Payment Reminders',
          description: 'The system sends friendly reminders to customers about payments due. You also get notified to follow up. Improve cash flow.',
          icon: '📧',
          origin: 'Dukahub-Exclusive',
          useCase: 'Perfect for reducing time spent chasing payments'
        },
        {
          title: 'See What\'s Owed',
          description: 'Instantly see how much each customer owes you and how much you owe each supplier. Everything calculated automatically from your sales and purchases.',
          icon: '💰',
          origin: 'Dukahub-Exclusive',
          useCase: 'Essential for managing cash flow and collections'
        }
      ]
    },
    {
      name: 'Business Intelligence',
      description: 'Make better decisions with real data',
      features: [
        {
          title: 'Sales Reports & Insights',
          description: 'See what\'s selling, what\'s not, and trends over time. Make decisions based on real data, not guesswork.',
          icon: '📊',
          origin: 'Dukahub-Enhanced',
          useCase: 'Perfect for understanding your business performance'
        },
        {
          title: 'Top Products Analysis',
          description: 'Quickly see your best-selling items. Know what to stock more of. Identify opportunities to grow.',
          icon: '⭐',
          origin: 'Dukahub-Enhanced',
          useCase: 'Ideal for optimizing your product mix'
        },
        {
          title: 'Built-in Accounting',
          description: 'Every sale, payment, and purchase is automatically recorded in a double-entry ledger. No need for separate accounting software.',
          icon: '📚',
          origin: 'Dukahub-Exclusive',
          useCase: 'Perfect for businesses that want integrated accounting'
        },
        {
          title: 'Performance Dashboards',
          description: 'See key metrics at a glance. Sales, inventory, and cash flow all in one place. Designed for small businesses, not complex BI tools.',
          icon: '📈',
          origin: 'Dukahub-Enhanced',
          useCase: 'Essential for owners who want quick insights'
        }
      ]
    },
    {
      name: 'Team & Access',
      description: 'Work together securely',
      features: [
        {
          title: 'Multi-user Support',
          description: 'Add team members to your account. Everyone can work together while you control who can do what.',
          icon: '👨‍👩‍👧‍👦',
          origin: 'Standard',
          useCase: 'Perfect for businesses with multiple staff members'
        },
        {
          title: 'Control Who Can Do What',
          description: 'Set different permission levels for different roles. Owners see everything, cashiers can only sell, managers can adjust prices. Keep your business secure.',
          icon: '🔒',
          origin: 'Dukahub-Enhanced',
          useCase: 'Essential for businesses with multiple staff and different roles'
        },
        {
          title: 'Run Multiple Shops',
          description: 'Manage multiple shops or businesses from one account. Each shop has its own inventory and sales, but you control everything from one place.',
          icon: '🏬',
          origin: 'Dukahub-Enhanced',
          useCase: 'Perfect for business owners with multiple locations'
        }
      ]
    },
    {
      name: 'Reliability & Integration',
      description: 'Built to work when you need it',
      features: [
        {
          title: 'Designed for Offline Use',
          description: 'Built from the ground up to work without internet. Your catalog is stored on your device. Sales continue even when connectivity is poor.',
          icon: '📱',
          origin: 'Dukahub-Exclusive',
          useCase: 'Critical for areas with unreliable internet'
        },
        {
          title: 'M-Pesa Integration',
          description: 'Accept M-Pesa payments directly. Everything is tracked automatically. No need to manually reconcile payments.',
          icon: '📲',
          origin: 'Dukahub-Exclusive',
          useCase: 'Essential for Kenyan businesses accepting mobile money'
        },
        {
          title: 'API Access',
          description: 'Connect Dukahub to other systems you use. Build custom integrations. For technical users who need more.',
          icon: '🔌',
          origin: 'Standard',
          useCase: 'For businesses that need custom integrations'
        },
        {
          title: 'Your Data is Secure',
          description: 'Industry-standard security protects your business data. Your information stays private and is never shared.',
          icon: '🛡️',
          origin: 'Dukahub-Exclusive',
          useCase: 'Essential for protecting your business information'
        }
      ]
    }
  ];

  protected readonly comparisonData = {
    dukahub: [
      'Point phone to sell (no barcode needed)',
      'Works without internet',
      'Built-in accounting',
      'Track customers and suppliers together',
      'M-Pesa integration',
      'Automatic payment reminders',
      'Multi-shop support'
    ],
    manual: [
      'Write everything by hand',
      'Count stock manually',
      'Chase payments yourself',
      'No insights or reports',
      'Prone to errors',
      'Time-consuming'
    ],
    genericPOS: [
      'Requires barcode scanner',
      'Needs constant internet',
      'Separate accounting software',
      'Basic customer tracking only',
      'No M-Pesa integration',
      'Limited reporting'
    ]
  };

  protected readonly comingSoonFeatures: ComingSoonFeature[] = [
    {
      icon: '📊',
      title: 'Ledger control',
      description: 'Full control over your accounting ledger with detailed transaction tracking and reconciliation.',
      category: 'Accounting'
    },
    {
      icon: '📦',
      title: 'COGS via FIFO tracking',
      description: 'Track cost of goods sold using FIFO method with batch tracking for expiry management and automated reminders.',
      category: 'Accounting'
    },
    {
      icon: '💼',
      title: 'Expenses management',
      description: 'Comprehensive ERP features for tracking and managing business expenses with categorization and reporting.',
      category: 'Accounting'
    },
    {
      icon: '🔒',
      title: 'Period end closing',
      description: 'Enforce reconciliation of payment accounts before closing periods, ensuring ledger accuracy with inter-account transfer support.',
      category: 'Accounting'
    }
  ];
}



