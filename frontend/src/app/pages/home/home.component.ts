import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../core/layout/footer/footer.component';
import { NavbarComponent } from '../../core/layout/navbar/navbar.component';

interface PricingPlan {
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  description: string;
  features: { text: string; included: boolean }[];
  ctaText: string;
  ctaLink: string;
  popular?: boolean;
}

interface Testimonial {
  quote: string;
  author: string;
  title: string;
  metric?: string;
}

interface SocialProof {
  customerCount: number;
  recentSignups: number;
  timeSaved: string;
}

interface FeatureHighlight {
  icon: string;
  text: string;
}

interface CorePillar {
  icon: string;
  title: string;
  description: string;
  bullets: string[];
}

interface JourneyStage {
  number: string;
  title: string;
  summary: string;
  detail: string;
}

interface ValueHighlight {
  icon: string;
  title: string;
  description: string;
  badge: string;
}

interface ComingSoonFeature {
  icon: string;
  title: string;
  description: string;
  category: string;
}

interface FAQItem {
  question: string;
  answer: string;
  open: boolean;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  protected readonly isYearly = signal(false);

  protected readonly socialProof: SocialProof = {
    customerCount: 500,
    recentSignups: 50,
    timeSaved: '2 hours daily'
  };

  protected readonly heroHighlights: FeatureHighlight[] = [
    { icon: '⚡', text: 'Sell in 3 seconds' },
    { icon: '📡', text: 'Works without internet' },
    { icon: '💳', text: 'Accept cash & M-Pesa' }
  ];

  protected readonly corePillars: CorePillar[] = [
    {
      icon: '📷',
      title: 'Faster selling',
      description: 'Point your phone at price labels or barcodes and ring up a sale instantly.',
      bullets: ['Label-photo recognition', 'Barcode scanning', '3-second checkout']
    },
    {
      icon: '📦',
      title: 'Clear inventory',
      description: 'Always know what is in stock across every shelf, stall, or warehouse.',
      bullets: ['Real-time counts', 'Multi-location tracking', 'Low-stock nudges']
    },
    {
      icon: '💰',
      title: 'Healthy cash flow',
      description: 'Stay on top of customer and supplier balances without extra spreadsheets.',
      bullets: ['Credit limits & approvals', 'Automatic reminders', 'Ledger built in']
    },
    {
      icon: '📈',
      title: 'Decisions with data',
      description: 'See daily trends, best sellers, and what needs attention at a glance.',
      bullets: ['Dashboards & reports', 'Top product insights', 'Performance alerts']
    }
  ];

  protected readonly journeyStages: JourneyStage[] = [
    {
      number: '1',
      title: 'Capture your catalog',
      summary: 'Scan labels or take five quick photos per product.',
      detail: 'Dukahub learns each item in under a minute — no spreadsheets required.'
    },
    {
      number: '2',
      title: 'Sell from any device',
      summary: 'Point, confirm, and accept cash or M-Pesa in seconds.',
      detail: 'No signal? Keep selling. Each sale syncs automatically when you reconnect.'
    },
    {
      number: '3',
      title: 'Stay in control',
      summary: 'Stock, cash, and credit update automatically after every sale.',
      detail: 'Reminders and dashboards keep your whole team aligned and confident.'
    }
  ];

  protected readonly valueHighlights: ValueHighlight[] = [
    {
      icon: '🕒',
      title: 'Save two hours daily',
      description: 'Cut manual books and endless follow-up calls.',
      badge: 'Time back'
    },
    {
      icon: '🚫',
      title: 'Prevent lost sales',
      description: 'Sell even during outages or peak rush, without missing a beat.',
      badge: 'No guesswork'
    },
    {
      icon: '🤝',
      title: 'Build customer trust',
      description: 'Show clear balances and histories for every customer and supplier.',
      badge: 'Transparent'
    }
  ];

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
      description: 'Track cost of goods sold using FIFO method with batch tracking to accurately calculate inventory costs.',
      category: 'Accounting'
    },
    {
      icon: '⏰',
      title: 'Expiry tracking & reminders',
      description: 'Track product batches with expiry dates and receive automated reminders before items expire, reducing waste and losses.',
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

  protected readonly pricingPlans: PricingPlan[] = [
    {
      name: 'Pro Trial',
      monthlyPrice: 'KES 0',
      yearlyPrice: 'KES 0',
      description: 'Try every Dukahub feature free for 30 days. No credit card required.',
      features: [
        { text: 'Full Pro access for 30 days', included: true },
        { text: 'Sell with camera, barcode, or quick search', included: true },
        { text: 'Works offline and syncs when online', included: true },
        { text: 'Track customer & supplier credit', included: true },
        { text: 'Automatic payment reminders', included: true },
        { text: 'Dashboards and product insights', included: true }
      ],
      ctaText: 'Start Free 30-Day Trial',
      ctaLink: '/signup?plan=pro&trial=true'
    },
    {
      name: 'Pro',
      monthlyPrice: 'KES 1,500',
      yearlyPrice: 'KES 14,400',
      description: 'Everything a growing shop needs to stay organised, sell fast, and stay on top of cash flow.',
      features: [
        { text: 'Unlimited products and locations', included: true },
        { text: 'Camera recognition & barcode selling', included: true },
        { text: 'Offline-first POS with auto-sync', included: true },
        { text: 'Customer & supplier credit controls', included: true },
        { text: 'Payment reminders & MPesa integration', included: true },
        { text: 'Dashboards, reports, and exports', included: true }
      ],
      ctaText: 'Start Your Free 30-Day Trial',
      ctaLink: '/signup?plan=pro&trial=true',
      popular: true
    },
    {
      name: 'Enterprise',
      monthlyPrice: 'Custom',
      yearlyPrice: 'Custom',
      description: 'For larger teams that need custom integrations, locations, or dedicated support.',
      features: [
        { text: 'Everything in Pro', included: true },
        { text: 'Unlimited users & locations', included: true },
        { text: 'Advanced API integrations', included: true },
        { text: 'Dedicated success manager', included: true },
        { text: 'Custom onboarding & training', included: true }
      ],
      ctaText: 'Contact Sales',
      ctaLink: '/contact'
    }
  ];

  protected readonly testimonials: Testimonial[] = [
    {
      quote: 'Dukahub is so easy! Pointing my phone is faster than typing. Finally know my stock levels accurately.',
      author: 'Amina K.',
      title: 'Mini Mart Owner, Nairobi',
      metric: 'Saves 2 hours daily'
    },
    {
      quote: 'The offline mode is a lifesaver during power cuts. Sales are recorded, and sync perfectly later. Highly recommend!',
      author: 'David M.',
      title: 'Agrovet Manager, Nakuru',
      metric: 'Never lost a sale again'
    },
    {
      quote: 'We use it for our salon services with picture cards. Tracking popular services and sales is simple now.',
      author: 'Grace W.',
      title: 'Salon Owner, Mombasa',
      metric: '30% more organized'
    }
  ];

  protected readonly faqItems = signal<FAQItem[]>([
    {
      question: 'What happens after my 30-day trial ends?',
      answer: 'After your free 30-day trial, you can upgrade to Pro (KES 1,500/month) to keep using all features, or pause your account. You can upgrade anytime. No credit card needed to start.',
      open: false
    },
    {
      question: 'How does the product recognition work?',
      answer: 'Take a few photos of each product. When you sell, just point your camera at the product and it recognizes it in seconds. Works great for items without barcodes. Barcode scanning also works if available.',
      open: false
    },
    {
      question: 'Does it work without internet?',
      answer: 'Yes! You can record up to 30 sales without internet. Everything is stored safely on your device. When you reconnect, it syncs automatically. Perfect for areas with unreliable internet.',
      open: false
    },
    {
      question: 'Is my data safe?',
      answer: 'Yes. Your business data is encrypted and kept private. We never share your information. Security is a top priority.',
      open: false
    },
    {
      question: 'How long does setup take?',
      answer: 'Most businesses are set up in under an hour. Sign up, add products by scanning barcodes or taking photos, and you\'re ready to go. Simple and intuitive.',
      open: false
    },
    {
      question: 'Can I track services too?',
      answer: 'Yes! Create visual cards for services like haircuts or repairs. Track them just like products. Perfect for salons, barbers, and service businesses.',
      open: false
    }
  ]);

  togglePricing(): void {
    this.isYearly.update(value => !value);
  }

  toggleFAQ(index: number): void {
    this.faqItems.update(items => {
      const updated = [...items];
      updated[index].open = !updated[index].open;
      return updated;
    });
  }

  protected readonly stars = [1, 2, 3, 4, 5];
}

