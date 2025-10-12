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

  protected readonly pricingPlans: PricingPlan[] = [
    {
      name: 'Free',
      monthlyPrice: 'KES 0',
      yearlyPrice: 'KES 0',
      description: 'Perfect for getting started.',
      features: [
        { text: 'Up to 50 products', included: true },
        { text: 'Basic sales reports', included: true },
        { text: 'Single user', included: true },
        { text: 'M-Pesa integration', included: true },
        { text: 'Offline Mode', included: true },
        { text: 'Advanced insights', included: false },
        { text: 'Credit sales tracking', included: false },
        { text: 'Smart inventory alerts', included: false }
      ],
      ctaText: 'Get Started Free',
      ctaLink: '/signup?plan=free'
    },
    {
      name: 'Pro',
      monthlyPrice: 'KES 1,500',
      yearlyPrice: 'KES 14,400',
      description: 'For growing businesses.',
      features: [
        { text: 'Unlimited products', included: true },
        { text: 'Advanced reporting', included: true },
        { text: 'Up to 5 users', included: true },
        { text: 'M-Pesa integration', included: true },
        { text: 'Offline Mode', included: true },
        { text: 'Credit sales tracking', included: true },
        { text: 'Smart inventory alerts', included: true }
      ],
      ctaText: 'Start 14-Day Pro Trial Now',
      ctaLink: '/signup?plan=pro&trial=true',
      popular: true
    },
    {
      name: 'Enterprise',
      monthlyPrice: 'Custom',
      yearlyPrice: 'Custom',
      description: 'Tailored for larger businesses.',
      features: [
        { text: 'Everything in Pro', included: true },
        { text: 'Unlimited users', included: true },
        { text: 'Multi-location support', included: true },
        { text: 'API access', included: true },
        { text: 'Dedicated support', included: true },
        { text: 'Offline Mode', included: true }
      ],
      ctaText: 'Contact Us',
      ctaLink: '/contact'
    }
  ];

  protected readonly testimonials: Testimonial[] = [
    {
      quote: 'Dukahub is so easy! Pointing my phone is faster than typing. Finally know my stock levels accurately.',
      author: 'Amina K.',
      title: 'Mini Mart Owner, Nairobi'
    },
    {
      quote: 'The offline mode is a lifesaver during power cuts. Sales are recorded, and sync perfectly later. Highly recommend!',
      author: 'David M.',
      title: 'Agrovet Manager, Nakuru'
    },
    {
      quote: 'We use it for our salon services with picture cards. Tracking popular services and sales is simple now.',
      author: 'Grace W.',
      title: 'Salon Owner, Mombasa'
    }
  ];

  protected readonly faqItems = signal<FAQItem[]>([
    {
      question: 'How does the AI product recognition work?',
      answer: 'You take about 5 photos of each product from different angles using the app. Our AI system learns to identify the item visually. When making a sale, just point your camera, and the app recognizes it. This is great for items without barcodes. Barcode scanning is also supported and is usually faster if available.',
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
      answer: 'Most businesses are set up in under an hour. Download the app, sign up, and start adding products by scanning barcodes or taking photos. It\'s designed to be intuitive, even if you\'re not tech-savvy.',
      open: false
    },
    {
      question: 'Can I use it for services (salon, repair)?',
      answer: 'Absolutely! Create simple visual cards or icons for your services (e.g., a picture for \'Haircut\'). Add them like products, and the AI or you can select them during sales. You can track service sales and popularity easily.',
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
}

