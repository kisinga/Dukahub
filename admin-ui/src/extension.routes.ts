export const extensionRoutes = [  {
    path: 'extensions/subscription-tiers',
    loadChildren: () => import('./extensions/6e657b5e87e67cb314e8529e66179af45dc67297ae292a0095b74526581b24f9/subscription-tier.module').then(m => m.SubscriptionTierModule),
  },
  {
    path: 'extensions/subscription-tiers',
    loadChildren: () => import('./extensions/6e657b5e87e67cb314e8529e66179af45dc67297ae292a0095b74526581b24f9/routes'),
  }];
