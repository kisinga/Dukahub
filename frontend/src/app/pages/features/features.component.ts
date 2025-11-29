import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
} from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FooterComponent } from '../../core/layout/footer/footer.component';
import { NavbarComponent } from '../../core/layout/navbar/navbar.component';

interface Feature {
  title: string;
  description: string;
  icon: string;
  origin: 'dukarun-Exclusive' | 'dukarun-Enhanced' | 'Standard';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesComponent implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private observers: IntersectionObserver[] = [];
  private isUpdatingHash = false;

  protected readonly categories: FeatureCategory[] = [
    {
      name: 'Getting Started',
      description: 'Designed for everyone — no barriers to professional accounting',
      features: [
        {
          title: 'No Complex Hardware Required',
          description:
            'Works on any smartphone. No barcode scanners, printers, or special equipment needed. Your phone is all you need to run a professional business system.',
          icon: '📱',
          origin: 'dukarun-Exclusive',
          useCase:
            'Perfect for businesses that want to start immediately without investing in hardware',
        },
        {
          title: 'No Computer Literacy Needed',
          description:
            'If you know how to use a smartphone, you can use Dukarun. No training required — most things are intuitive. The system is designed to be as simple as using any modern app.',
          icon: '🎓',
          origin: 'dukarun-Exclusive',
          useCase:
            'Ideal for business owners who want professional tools without the learning curve',
        },
        {
          title: 'Intuitive Smartphone Interface',
          description:
            'Designed for touch and simplicity. Everything you need is just a tap away. The interface works naturally, just like using any smartphone app you already know.',
          icon: '💡',
          origin: 'dukarun-Exclusive',
          useCase: 'Perfect for teams that want to get started quickly without extensive training',
        },
        {
          title: 'Simple Step-by-Step Tutorials',
          description:
            'Clear, easy-to-follow tutorials teach you how to use the system. Most features work intuitively, but helpful guides are available whenever you need them.',
          icon: '📚',
          origin: 'dukarun-Exclusive',
          useCase: 'Great for new users who want guidance while learning the system',
        },
        {
          title: 'Professional Accounting Made Accessible',
          description:
            'Lowers the barrier to professional accounting. Get enterprise-level financial tracking, double-entry ledger, and comprehensive reporting without the complexity.',
          icon: '📊',
          origin: 'dukarun-Exclusive',
          useCase:
            'Essential for businesses that want professional accounting without hiring accountants',
        },
        {
          title: 'Powerful Insights Without Complexity',
          description:
            'Pro-level business tool that gives you powerful information for gauging business status and making data-driven decisions to grow your business to the next stage.',
          icon: '🚀',
          origin: 'dukarun-Exclusive',
          useCase:
            'Perfect for business owners who want actionable insights without complex dashboards',
        },
      ],
    },
    {
      name: 'Selling & Checkout',
      description: 'Everything you need to sell quickly and accurately',
      features: [
        {
          title: 'Point Your Phone, Sell Instantly',
          description:
            'Point your phone camera at a price label or product. dukarun recognizes it instantly and adds it to your cart. No typing, no barcode scanner needed. Perfect for fresh produce, services, and items without barcodes.',
          icon: '📷',
          origin: 'dukarun-Exclusive',
          useCase: 'Perfect for markets, salons, and shops selling items without barcodes',
        },
        {
          title: 'Barcode Scanning',
          description:
            'Scan barcodes to quickly add packaged goods to your cart or create new products. Fast and accurate for items with barcodes.',
          icon: '📊',
          origin: 'dukarun-Enhanced',
          useCase: 'Ideal for packaged goods and products with barcodes',
        },
        {
          title: 'Works Without Internet',
          description:
            'Continue selling even when internet is down. Record up to 30 sales offline. Everything syncs automatically when you reconnect. Never lose a sale.',
          icon: '📡',
          origin: 'dukarun-Exclusive',
          useCase: 'Essential for areas with unreliable internet or during power cuts',
        },
        {
          title: 'Accept Cash and M-Pesa',
          description:
            'Take payments via cash and M-Pesa in one system. Track M-Pesa payments automatically in your books with full ledger integration. Customer-initiated M-Pesa payments (STK Push) coming soon.',
          icon: '💳',
          origin: 'dukarun-Exclusive',
          useCase: 'Perfect for Kenyan businesses accepting both cash and mobile money',
        },
        {
          title: 'Sell Services Too',
          description:
            'Create visual cards for services like haircuts or repairs. Track service sales just like products. No need for separate systems.',
          icon: '✂️',
          origin: 'Standard',
          useCase: 'Ideal for salons, barbers, repair shops, and service businesses',
        },
      ],
    },
    {
      name: 'Inventory & Stock',
      description: 'Know exactly what you have, where it is, and when to reorder',
      features: [
        {
          title: 'Real-time Stock Tracking',
          description:
            'See exactly how much stock you have at any moment. Every sale updates your inventory instantly. No more guessing or manual counting.',
          icon: '📦',
          origin: 'dukarun-Enhanced',
          useCase: 'Essential for any business that manages inventory',
        },
        {
          title: 'Multiple Stock Locations',
          description:
            "Track inventory across multiple shops or warehouses. See what's where at a glance. Perfect for businesses with multiple locations.",
          icon: '🏪',
          origin: 'Standard',
          useCase: 'Perfect for businesses with multiple shops or warehouses',
        },
        {
          title: 'Stock Adjustments',
          description:
            'Easily adjust stock levels when needed. Record damages, losses, or corrections. Everything is tracked with a clear audit trail.',
          icon: '📝',
          origin: 'dukarun-Enhanced',
          useCase: 'Ideal when you need to correct stock counts or record losses',
        },
        {
          title: 'Low Stock Alerts',
          description:
            'Get notified when items are running low. Never run out of popular items. Make better decisions about what to order.',
          icon: '🔔',
          origin: 'dukarun-Exclusive',
          useCase: 'Perfect for preventing stockouts and reducing waste',
        },
      ],
    },
    {
      name: 'Customers & Suppliers',
      description: 'Manage everyone you do business with in one place',
      features: [
        {
          title: 'One System for Customers and Suppliers',
          description:
            'Track customers and suppliers in the same system. No need for separate lists. See everything in one place.',
          icon: '👥',
          origin: 'dukarun-Exclusive',
          useCase: 'Simplifies operations for businesses dealing with both customers and suppliers',
        },
        {
          title: 'Track Credit and Limits',
          description:
            'Set credit limits for customers. The system automatically checks limits before allowing credit sales. Prevent bad debt.',
          icon: '💳',
          origin: 'dukarun-Exclusive',
          useCase: 'Essential for businesses that sell on credit',
        },
        {
          title: 'Automatic Payment Reminders',
          description:
            'The system sends friendly reminders to customers about payments due. You also get notified to follow up. Improve cash flow.',
          icon: '📧',
          origin: 'dukarun-Exclusive',
          useCase: 'Perfect for reducing time spent chasing payments',
        },
        {
          title: "See What's Owed",
          description:
            'Instantly see how much each customer owes you and how much you owe each supplier. Everything calculated automatically from your sales and purchases.',
          icon: '💰',
          origin: 'dukarun-Exclusive',
          useCase: 'Essential for managing cash flow and collections',
        },
      ],
    },
    {
      name: 'Business Intelligence',
      description: 'Make better decisions with real data',
      features: [
        {
          title: 'Sales Reports & Insights',
          description:
            "See what's selling, what's not, and trends over time. Make decisions based on real data, not guesswork.",
          icon: '📊',
          origin: 'dukarun-Enhanced',
          useCase: 'Perfect for understanding your business performance',
        },
        {
          title: 'Top Products Analysis',
          description:
            'Quickly see your best-selling items. Know what to stock more of. Identify opportunities to grow.',
          icon: '⭐',
          origin: 'dukarun-Enhanced',
          useCase: 'Ideal for optimizing your product mix',
        },
        {
          title: 'Built-in Accounting',
          description:
            'Every sale, payment, and purchase is automatically recorded in a double-entry ledger. No need for separate accounting software.',
          icon: '📚',
          origin: 'dukarun-Exclusive',
          useCase: 'Perfect for businesses that want integrated accounting',
        },
        {
          title: 'Performance Dashboards',
          description:
            'See key metrics at a glance. Sales, inventory, and cash flow all in one place. Designed for small businesses, not complex BI tools.',
          icon: '📈',
          origin: 'dukarun-Enhanced',
          useCase: 'Essential for owners who want quick insights',
        },
      ],
    },
    {
      name: 'Team & Access',
      description: 'Work together securely',
      features: [
        {
          title: 'Multi-user Support',
          description:
            'Add team members to your account. Everyone can work together while you control who can do what.',
          icon: '👨‍👩‍👧‍👦',
          origin: 'Standard',
          useCase: 'Perfect for businesses with multiple staff members',
        },
        {
          title: 'Control Who Can Do What',
          description:
            'Set different permission levels for different roles. Owners see everything, cashiers can only sell, managers can adjust prices. Keep your business secure.',
          icon: '🔒',
          origin: 'dukarun-Enhanced',
          useCase: 'Essential for businesses with multiple staff and different roles',
        },
        {
          title: 'Run Multiple Shops',
          description:
            'Manage multiple shops or businesses from one account. Each shop has its own inventory and sales, but you control everything from one place.',
          icon: '🏬',
          origin: 'dukarun-Enhanced',
          useCase: 'Perfect for business owners with multiple locations',
        },
      ],
    },
    {
      name: 'Reliability & Integration',
      description: 'Built to work when you need it',
      features: [
        {
          title: 'Designed for Offline Use',
          description:
            'Built from the ground up to work without internet. Your catalog is stored on your device. Sales continue even when connectivity is poor.',
          icon: '📱',
          origin: 'dukarun-Exclusive',
          useCase: 'Critical for areas with unreliable internet',
        },
        {
          title: 'M-Pesa Integration',
          description:
            'Track M-Pesa payments automatically in your ledger. Record M-Pesa receipts from your existing Till number with full accounting integration. Customer-initiated payments (STK Push) coming soon.',
          icon: '📲',
          origin: 'dukarun-Exclusive',
          useCase: 'Essential for Kenyan businesses accepting mobile money',
        },
        {
          title: 'API Access',
          description:
            'Connect dukarun to other systems you use. Build custom integrations. For technical users who need more.',
          icon: '🔌',
          origin: 'Standard',
          useCase: 'For businesses that need custom integrations',
        },
        {
          title: 'Your Data is Secure',
          description:
            'Industry-standard security protects your business data. Your information stays private and is never shared.',
          icon: '🛡️',
          origin: 'dukarun-Exclusive',
          useCase: 'Essential for protecting your business information',
        },
      ],
    },
  ];

  protected readonly comparisonData = {
    dukarun: [
      'Point phone to sell (no barcode needed)',
      'Works without internet',
      'Built-in accounting',
      'Track customers and suppliers together',
      'M-Pesa integration',
      'Automatic payment reminders',
      'Multi-shop support',
    ],
    manual: [
      'Write everything by hand',
      'Count stock manually',
      'Chase payments yourself',
      'No insights or reports',
      'Prone to errors',
      'Time-consuming',
    ],
    genericPOS: [
      'Requires barcode scanner',
      'Needs constant internet',
      'Separate accounting software',
      'Basic customer tracking only',
      'No M-Pesa integration',
      'Limited reporting',
    ],
  };

  protected readonly comingSoonFeatures: ComingSoonFeature[] = [
    {
      icon: '🔐',
      title: 'Spot leaks instantly',
      description:
        'Daily & Randomized Reconciliation. Catch cash or stock leaks the moment they happen with surprise audit tools.',
      category: 'Financial Control',
    },
    {
      icon: '📈',
      title: 'Protect your margins',
      description:
        'True Profit Tracking (FIFO). Know exactly how much you made on every single item, even when supplier prices change.',
      category: 'Profitability',
    },
    {
      icon: '🏛️',
      title: 'Audit-proof records',
      description:
        'Financial Integrity. A full double-entry ledger that works in the background to keep your accountant happy and your tax compliant.',
      category: 'Accounting',
    },
    {
      icon: '🤝',
      title: 'Seamless Returns',
      description:
        'Handle customer returns and exchanges without messing up your inventory counts or cash balance.',
      category: 'Operations',
    },
  ];

  /**
   * Convert category name to URL-friendly ID
   */
  getCategoryId(categoryName: string): string {
    return categoryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  ngAfterViewInit(): void {
    this.setupScrollSpy();
    this.handleInitialHash();
  }

  ngOnDestroy(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }

  private setupScrollSpy(): void {
    // Static sections
    const staticIds = ['hero', 'compare', 'coming-soon', 'cta'];

    // Dynamic category sections
    const categoryIds = this.categories.map((cat) => this.getCategoryId(cat.name));

    const allIds = [...staticIds, ...categoryIds];

    const options: IntersectionObserverInit = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: [0.1, 0.5],
    };

    const observer = new IntersectionObserver((entries) => {
      if (this.isUpdatingHash) return;

      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visibleEntries.length > 0) {
        const id = visibleEntries[0].target.id;
        if (id) {
          this.updateHash(id);
        }
      }
    }, options);

    allIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    this.observers.push(observer);
  }

  private updateHash(id: string): void {
    this.isUpdatingHash = true;
    const url = this.router.url.split('#')[0];
    this.location.replaceState(`${url}#${id}`);
    // Use setTimeout to reset flag after location update
    setTimeout(() => {
      this.isUpdatingHash = false;
    }, 0);
  }

  private handleInitialHash(): void {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }
}
