import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../core/layout/navbar/navbar.component';
import { FooterComponent } from '../../core/layout/footer/footer.component';

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

  protected readonly pricingPlans: PricingPlan[] = [
    {
      name: 'Pro Trial',
      monthlyPrice: 'KES 0',
      yearlyPrice: 'KES 0',
      description: 'Try Pro free for 30 days. Full access to all features, no credit card required.',
      features: [
        { text: '30-day access to all Pro features', included: true },
        { text: 'AI camera recognition - sell in 3 seconds', included: true },
        { text: 'Customer & supplier credit management', included: true },
        { text: 'Automatic payment reminders', included: true },
        { text: 'Advanced reporting & insights', included: true },
        { text: 'Up to 5 users', included: true },
        { text: 'M-Pesa integration', included: true },
        { text: 'Reliable offline mode', included: true },
        { text: 'Smart inventory alerts', included: true },
        { text: 'After 30 days: Upgrade to Pro or pause account', included: true }
      ],
      ctaText: 'Start Free 30-Day Trial',
      ctaLink: '/signup?plan=pro&trial=true'
    },
    {
      name: 'Pro',
      monthlyPrice: 'KES 1,500',
      yearlyPrice: 'KES 14,400',
      description: 'The complete solution. Everything you need to grow your business. Join serious businesses.',
      features: [
        { text: 'Unlimited products', included: true },
        { text: 'AI camera recognition - sell in 3 seconds', included: true },
        { text: 'Customer & supplier credit management', included: true },
        { text: 'Automatic payment reminders (you & customers)', included: true },
        { text: 'Advanced reporting & insights', included: true },
        { text: 'Up to 5 users', included: true },
        { text: 'M-Pesa integration', included: true },
        { text: 'Reliable offline mode', included: true },
        { text: 'Smart inventory alerts', included: true }
      ],
      ctaText: 'Start Your Free 30-Day Trial',
      ctaLink: '/signup?plan=pro&trial=true',
      popular: true
    },
    {
      name: 'Enterprise',
      monthlyPrice: 'Custom',
      yearlyPrice: 'Custom',
      description: 'For larger businesses with multiple locations. Custom solutions tailored to your needs.',
      features: [
        { text: 'Everything in Pro', included: true },
        { text: 'Unlimited users', included: true },
        { text: 'Multi-location support', included: true },
        { text: 'API access', included: true },
        { text: 'Dedicated support', included: true },
        { text: 'Custom integrations', included: true },
        { text: 'Priority feature requests', included: true }
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
      question: 'What happens after my 30-day Pro trial ends?',
      answer: 'After your 30-day free Pro trial, you can choose to upgrade to Pro (KES 1,500/month) to continue using all features, or your account will be paused. You can reactivate and upgrade to Pro anytime. Pro is our complete solution with all features - the trial gives you full access to experience everything before committing.',
      open: false
    },
    {
      question: 'How does the AI product recognition work?',
      answer: 'You take about 5 photos of each product from different angles using the app. Our AI system learns to identify the item visually. When making a sale, just point your camera, and the app recognizes it in seconds. This is great for items without barcodes. Barcode scanning is also supported and is usually faster if available.',
      open: false
    },
    {
      question: 'How does the offline mode work? Is it safe?',
      answer: 'You can record up to 30 sales transactions completely offline. The data is stored securely on your device. When you reconnect to the internet, the app syncs each transaction individually and carefully checks against your online inventory to prevent errors like selling out-of-stock items. It\'s designed for reliability in areas with unstable internet.',
      open: false
    },
    {
      question: 'Is my business data secure and private?',
      answer: 'Yes. Security is a top priority. We use industry-standard encryption for data stored on your device and when it\'s synced to our servers. Your specific business data (sales, inventory) is kept confidential and is not shared. We comply with data protection best practices.',
      open: false
    },
    {
      question: 'How long does it take to set up?',
      answer: 'Most businesses are set up in under an hour. Download the app, sign up for your free Pro trial, and start adding products by scanning barcodes or taking photos. It\'s designed to be intuitive, even if you\'re not tech-savvy.',
      open: false
    },
    {
      question: 'Can I use it for services (salon, repair)?',
      answer: 'Absolutely! Create simple visual cards or icons for your services (e.g., a picture for \'Haircut\'). Add them like products, and the AI or you can select them during sales. You can track service sales and popularity easily.',
      open: false
    },
    {
      question: 'How does the credit management and automatic reminders work?',
      answer: 'Dukahub tracks all customer and supplier credit automatically. When you make a credit sale or purchase, the system records it. You can set up automatic reminders that notify both you and your customers when payments are due. This means customers get friendly reminders to pay, and you get notified to follow up. The system also tracks supplier payments you need to make, so you never miss a deadline. It\'s all designed to improve cash flow and reduce the time spent chasing payments.',
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

