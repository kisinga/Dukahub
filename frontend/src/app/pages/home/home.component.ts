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

interface FAQItem {
  question: string;
  answer: string;
  open: boolean;
}

interface BusinessExample {
  name: string;
  icon: string;
  // Internal metrics for knowledge (not displayed on page)
  marketShare: string;
  employeeRange: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  protected readonly isYearly = signal(false);

  protected readonly socialProof: SocialProof = {
    customerCount: 500,
    recentSignups: 50,
    timeSaved: '2 hours daily',
  };

  protected readonly heroHighlights: FeatureHighlight[] = [
    { icon: '📱', text: 'Start on your phone' },
    { icon: '🖥️', text: 'Grow to any size' },
    { icon: '🤝', text: 'Trust in every sale' },
  ];

  protected readonly corePillars: CorePillar[] = [
    {
      icon: '📷',
      title: 'Faster selling',
      description: 'Point your phone at price labels or barcodes and ring up a sale instantly.',
      bullets: ['Label-photo recognition', 'Barcode scanning', '3-second checkout'],
    },
    {
      icon: '📦',
      title: 'Clear inventory',
      description: 'Always know what is in stock across every shelf, stall, or warehouse.',
      bullets: ['Real-time counts', 'Multi-location tracking', 'Low-stock nudges'],
    },
    {
      icon: '💰',
      title: 'Healthy cash flow',
      description: 'Stay on top of customer and supplier balances without extra spreadsheets.',
      bullets: ['Credit limits & approvals', 'Automatic reminders', 'Ledger built in'],
    },
    {
      icon: '📈',
      title: 'Decisions with data',
      description: 'See daily trends, best sellers, and what needs attention at a glance.',
      bullets: ['Dashboards & reports', 'Top product insights', 'Performance alerts'],
    },
  ];

  protected readonly journeyStages: JourneyStage[] = [
    {
      number: '1',
      title: 'Capture your catalog',
      summary: 'Scan barcodes or take five quick photos of the product label.',
      detail: 'dukarun learns each item so that you can sell it in seconds.',
    },
    {
      number: '2',
      title: 'Sell from any device',
      summary: 'Point, confirm, and accept cash or M-Pesa in seconds.',
      detail: 'No signal? Keep selling. Each sale syncs automatically when you reconnect.',
    },
    {
      number: '3',
      title: 'Stay in control',
      summary: 'Stock, cash, and credit update automatically after every sale.',
      detail: 'Reminders and dashboards keep your whole team aligned and confident.',
    },
  ];

  protected readonly pricingPlans: PricingPlan[] = [
    {
      name: 'Pro',
      monthlyPrice: 'KES 1,500',
      yearlyPrice: 'KES 14,400',
      description:
        'Essential Shop Operations. Everything you need to sell fast, track stock, and stay organized.',
      features: [
        { text: 'Sell with camera, barcode, or search', included: true },
        { text: 'Offline-first POS with auto-sync', included: true },
        { text: 'Real-time inventory tracking', included: true },
        { text: 'Customer credit tracking', included: true },
        { text: 'Basic Sales Reports', included: true },
        { text: 'Unlimited products', included: true },
      ],
      ctaText: 'Start Free 30-Day Trial',
      ctaLink: '/signup?plan=pro&trial=true',
    },
    {
      name: 'Business',
      monthlyPrice: 'KES 2,500',
      yearlyPrice: 'KES 24,000',
      description:
        'Financial Control & Growth. For shops that need rigorous accounting, FIFO profit tracking, and deeper insights.',
      features: [
        { text: 'Everything in Pro', included: true },
        { text: 'True Profit Tracking (FIFO)', included: true },
        { text: 'Daily & Randomized Reconciliation', included: true },
        { text: 'Full Double-Entry Ledger', included: true },
        { text: 'Multi-store Management', included: true },
        { text: 'Advanced Financial Reports', included: true },
      ],
      ctaText: 'Start Free Business Trial',
      ctaLink: '/signup?plan=business&trial=true',
      popular: true,
    },
    {
      name: 'Enterprise',
      monthlyPrice: 'Custom',
      yearlyPrice: 'Custom',
      description:
        'Scale & Customization. For larger retail chains needing custom integrations and dedicated support.',
      features: [
        { text: 'Everything in Business', included: true },
        { text: 'Unlimited users & locations', included: true },
        { text: 'Advanced API integrations', included: true },
        { text: 'Dedicated success manager', included: true },
        { text: 'Custom onboarding & training', included: true },
      ],
      ctaText: 'Contact Sales',
      ctaLink: '/contact',
    },
  ];

  protected readonly testimonials: Testimonial[] = [
    {
      quote:
        'dukarun is so easy! Pointing my phone is faster than typing. Finally know my stock levels accurately.',
      author: 'Amina K.',
      title: 'Mini Mart Owner, Nairobi',
      metric: 'Saves 2 hours daily',
    },
    {
      quote:
        'The offline mode is a lifesaver during power cuts. Sales are recorded, and sync perfectly later. Highly recommend!',
      author: 'David M.',
      title: 'Agrovet Manager, Nakuru',
      metric: 'Never lost a sale again',
    },
    {
      quote:
        'We use it for our salon services with picture cards. Tracking popular services and sales is simple now.',
      author: 'Grace W.',
      title: 'Salon Owner, Mombasa',
      metric: '30% more organized',
    },
  ];

  // Business examples representing 80% of Kenyan MSMEs that can afford dukarun
  // Metrics stored for internal knowledge, only name and icon displayed on page
  protected readonly businessExamples: BusinessExample[] = [
    {
      name: 'Retail Shops & Dukas',
      icon: '🏪',
      marketShare: '38.3% of small enterprises',
      employeeRange: '1-9 employees',
    },
    {
      name: 'Agrovets & Pharmacies',
      icon: '💊',
      marketShare: 'Critical for agricultural economy',
      employeeRange: '1-9 employees',
    },
    {
      name: 'Kinyozi & Salons',
      icon: '✂️',
      marketShare: 'Growing service sector',
      employeeRange: '1-5 employees',
    },
    {
      name: 'Food & Beverage',
      icon: '🍽️',
      marketShare: 'Significant service sector',
      employeeRange: '1-9 employees',
    },
    {
      name: 'Hardware & Construction',
      icon: '🔨',
      marketShare: '14.5% of micro enterprises',
      employeeRange: '1-9 employees',
    },
  ];

  protected readonly faqItems = signal<FAQItem[]>([
    {
      question: 'What happens after my 30-day trial ends?',
      answer:
        'After your free 30-day trial, you can upgrade to Pro (KES 1,500/month) to keep using all features, or pause your account. You can upgrade anytime. No credit card needed to start.',
      open: false,
    },
    {
      question: 'How does the product recognition work?',
      answer:
        'Take a few photos of each product labels. When you sell, just point your camera at the label and it recognizes it in seconds. Works great for items without barcodes. Barcode scanning also works if available.',
      open: false,
    },
    {
      question: 'What do you mean by "product labels"?',
      answer:
        'These are the price tags or cards that you use to display the price of the product. They are usually handwritten and are unique to each product.',
      open: false,
    },
    {
      question: 'Why product labels and not products?',
      answer:
        'Product labels are more reliable than products. They are consistent and unique. They are also easier to scan than products.',
      open: false,
    },
    {
      question: 'Does it work without internet?',
      answer:
        'Yes! You can record up to 30 sales without internet. Everything is stored safely on your device. When you reconnect, it syncs automatically. Perfect for areas with unreliable internet.',
      open: false,
    },
    {
      question: 'Is my data safe?',
      answer:
        'Yes. Your business data is encrypted and kept private. We never share your information. Security is a top priority.',
      open: false,
    },
    {
      question: 'How long does setup take?',
      answer:
        "Most businesses are set up in under an hour. Sign up, add products by scanning barcodes or taking photos, and you're ready to go. Simple and intuitive.",
      open: false,
    },
    {
      question: 'Can I track services too?',
      answer:
        'Yes! Create visual cards for services like haircuts or repairs. Track them just like products. Perfect for salons, barbers, and service businesses.',
      open: false,
    },
  ]);

  togglePricing(): void {
    this.isYearly.update((value) => !value);
  }

  toggleFAQ(index: number): void {
    this.faqItems.update((items) => {
      const updated = [...items];
      updated[index].open = !updated[index].open;
      return updated;
    });
  }

  protected readonly stars = [1, 2, 3, 4, 5];
}
