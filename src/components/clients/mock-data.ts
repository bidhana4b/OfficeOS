import { Client, Activity, ClientPerformance } from './types';

export const mockClients: Client[] = [
  {
    id: 'client-1',
    businessName: 'Imperial Motors',
    category: 'Motorcycle Dealer',
    location: 'Dhaka, Bangladesh',
    contactInfo: {
      email: 'info@imperialmotors.bd',
      phone: '+880 1711-123456',
      website: 'https://imperialmotors.bd'
    },
    accountManager: {
      id: 'user-1',
      name: 'Rafiq Ahmed',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rafiq'
    },
    package: {
      name: 'Royal Dominance Package',
      tier: 'Advanced',
      type: 'Royal Dominance',
      startDate: '2024-01-01',
      renewalDate: '2024-12-31',
      monthlyFee: 85000,
      currency: 'BDT',
      description: 'Premium package for motorcycle dealers',
      features: ['Priority Support', 'Dedicated Account Manager', 'Monthly Reports'],
      platformCount: 3,
      correctionLimit: 5,
    },
    packageFeatures: [
      { deliverable_type: 'photo_graphics', label: 'Photo/Graphics Design', icon: 'image', total_allocated: 15, unit_label: 'designs', warning_threshold: 20, auto_deduction: true },
      { deliverable_type: 'video_edit', label: 'Video Edit', icon: 'video', total_allocated: 8, unit_label: 'videos', warning_threshold: 20, auto_deduction: true },
      { deliverable_type: 'copywriting', label: 'Copywriting', icon: 'pen-tool', total_allocated: 25, unit_label: 'copies', warning_threshold: 20, auto_deduction: true },
      { deliverable_type: 'boost_campaign', label: 'Boost Campaign', icon: 'rocket', total_allocated: 5, unit_label: 'campaigns', warning_threshold: 20, auto_deduction: true },
    ],
    usage: {
      design: { used: 8, total: 15 },
      video: { used: 3, total: 8 },
      copywriting: { used: 12, total: 25 },
      boost: { used: 2, total: 5 }
    },
    usageItems: [
      { deliverable_type: 'photo_graphics', label: 'Photo/Graphics Design', icon: 'image', used: 8, total: 15, unit_label: 'designs', warning_threshold: 20 },
      { deliverable_type: 'video_edit', label: 'Video Edit', icon: 'video', used: 3, total: 8, unit_label: 'videos', warning_threshold: 20 },
      { deliverable_type: 'copywriting', label: 'Copywriting', icon: 'pen-tool', used: 12, total: 25, unit_label: 'copies', warning_threshold: 20 },
      { deliverable_type: 'boost_campaign', label: 'Boost Campaign', icon: 'rocket', used: 2, total: 5, unit_label: 'campaigns', warning_threshold: 20 },
    ],
    status: 'active',
    healthScore: 92,
    wallet: {
      balance: 125000,
      currency: 'BDT'
    }
  },
  {
    id: 'client-2',
    businessName: 'Spice Paradise Restaurant',
    category: 'Restaurant',
    location: 'Chittagong, Bangladesh',
    contactInfo: {
      email: 'hello@spiceparadise.com',
      phone: '+880 1812-345678',
      website: 'https://spiceparadise.com'
    },
    accountManager: {
      id: 'user-2',
      name: 'Nazia Khan',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nazia'
    },
    package: {
      name: 'Infinity Growth Plan',
      tier: 'Growth',
      type: 'Infinity',
      startDate: '2024-03-15',
      renewalDate: '2025-03-14',
      monthlyFee: 35000,
      currency: 'BDT',
      description: 'Growth package for restaurants',
      features: ['Monthly Reports', 'Content Calendar'],
      platformCount: 2,
      correctionLimit: 3,
    },
    packageFeatures: [
      { deliverable_type: 'photo_graphics', label: 'Photo/Graphics Design', icon: 'image', total_allocated: 12, unit_label: 'designs', warning_threshold: 20, auto_deduction: true },
      { deliverable_type: 'video_edit', label: 'Video Edit', icon: 'video', total_allocated: 4, unit_label: 'videos', warning_threshold: 20, auto_deduction: true },
      { deliverable_type: 'copywriting', label: 'Copywriting', icon: 'pen-tool', total_allocated: 20, unit_label: 'copies', warning_threshold: 20, auto_deduction: true },
      { deliverable_type: 'boost_campaign', label: 'Boost Campaign', icon: 'rocket', total_allocated: 3, unit_label: 'campaigns', warning_threshold: 20, auto_deduction: true },
    ],
    usage: {
      design: { used: 6, total: 12 },
      video: { used: 2, total: 4 },
      copywriting: { used: 8, total: 20 },
      boost: { used: 1, total: 3 }
    },
    usageItems: [
      { deliverable_type: 'photo_graphics', label: 'Photo/Graphics Design', icon: 'image', used: 6, total: 12, unit_label: 'designs', warning_threshold: 20 },
      { deliverable_type: 'video_edit', label: 'Video Edit', icon: 'video', used: 2, total: 4, unit_label: 'videos', warning_threshold: 20 },
      { deliverable_type: 'copywriting', label: 'Copywriting', icon: 'pen-tool', used: 8, total: 20, unit_label: 'copies', warning_threshold: 20 },
      { deliverable_type: 'boost_campaign', label: 'Boost Campaign', icon: 'rocket', used: 1, total: 3, unit_label: 'campaigns', warning_threshold: 20 },
    ],
    status: 'active',
    healthScore: 78,
    wallet: {
      balance: 45000,
      currency: 'BDT'
    }
  },
  {
    id: 'client-3',
    businessName: 'TechCorp Solutions',
    category: 'Corporate',
    location: 'Sylhet, Bangladesh',
    contactInfo: {
      email: 'marketing@techcorp.bd',
      phone: '+880 1911-987654'
    },
    accountManager: {
      id: 'user-3',
      name: 'Kamal Hossain',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kamal'
    },
    package: {
      name: 'Eco Lite Starter',
      tier: 'Starter',
      type: 'Eco Lite',
      startDate: '2024-05-01',
      renewalDate: '2024-11-01',
      monthlyFee: 18000,
      currency: 'BDT',
      description: 'Starter package for corporate clients',
      features: ['Basic Support'],
      platformCount: 1,
      correctionLimit: 2,
    },
    packageFeatures: [
      { deliverable_type: 'photo_graphics', label: 'Photo/Graphics Design', icon: 'image', total_allocated: 6, unit_label: 'designs', warning_threshold: 20, auto_deduction: true },
      { deliverable_type: 'video_edit', label: 'Video Edit', icon: 'video', total_allocated: 2, unit_label: 'videos', warning_threshold: 20, auto_deduction: true },
      { deliverable_type: 'copywriting', label: 'Copywriting', icon: 'pen-tool', total_allocated: 10, unit_label: 'copies', warning_threshold: 20, auto_deduction: true },
      { deliverable_type: 'boost_campaign', label: 'Boost Campaign', icon: 'rocket', total_allocated: 1, unit_label: 'campaigns', warning_threshold: 20, auto_deduction: true },
    ],
    usage: {
      design: { used: 4, total: 6 },
      video: { used: 1, total: 2 },
      copywriting: { used: 9, total: 10 },
      boost: { used: 1, total: 1 }
    },
    usageItems: [
      { deliverable_type: 'photo_graphics', label: 'Photo/Graphics Design', icon: 'image', used: 4, total: 6, unit_label: 'designs', warning_threshold: 20 },
      { deliverable_type: 'video_edit', label: 'Video Edit', icon: 'video', used: 1, total: 2, unit_label: 'videos', warning_threshold: 20 },
      { deliverable_type: 'copywriting', label: 'Copywriting', icon: 'pen-tool', used: 9, total: 10, unit_label: 'copies', warning_threshold: 20 },
      { deliverable_type: 'boost_campaign', label: 'Boost Campaign', icon: 'rocket', used: 1, total: 1, unit_label: 'campaigns', warning_threshold: 20 },
    ],
    status: 'at-risk',
    healthScore: 58,
    wallet: {
      balance: 8000,
      currency: 'BDT'
    }
  },
  {
    id: 'client-4',
    businessName: 'Velocity Bikes Showroom',
    category: 'Motorcycle Dealer',
    location: 'Khulna, Bangladesh',
    contactInfo: {
      email: 'sales@velocitybikes.bd',
      phone: '+880 1611-456789',
      website: 'https://velocitybikes.bd'
    },
    accountManager: {
      id: 'user-1',
      name: 'Rafiq Ahmed',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rafiq'
    },
    package: {
      name: 'Royal Dominance Package',
      tier: 'Advanced',
      type: 'Royal Dominance',
      startDate: '2024-02-01',
      renewalDate: '2025-01-31',
      monthlyFee: 85000,
      currency: 'BDT',
      description: 'Premium package for motorcycle dealers',
      features: ['Priority Support', 'Dedicated Account Manager', 'Monthly Reports'],
      platformCount: 3,
      correctionLimit: 5,
    },
    packageFeatures: [
      { deliverable_type: 'photo_graphics', label: 'Photo/Graphics Design', icon: 'image', total_allocated: 15, unit_label: 'designs', warning_threshold: 20, auto_deduction: true },
      { deliverable_type: 'video_edit', label: 'Video Edit', icon: 'video', total_allocated: 8, unit_label: 'videos', warning_threshold: 20, auto_deduction: true },
      { deliverable_type: 'copywriting', label: 'Copywriting', icon: 'pen-tool', total_allocated: 25, unit_label: 'copies', warning_threshold: 20, auto_deduction: true },
      { deliverable_type: 'boost_campaign', label: 'Boost Campaign', icon: 'rocket', total_allocated: 5, unit_label: 'campaigns', warning_threshold: 20, auto_deduction: true },
    ],
    usage: {
      design: { used: 12, total: 15 },
      video: { used: 6, total: 8 },
      copywriting: { used: 18, total: 25 },
      boost: { used: 4, total: 5 }
    },
    usageItems: [
      { deliverable_type: 'photo_graphics', label: 'Photo/Graphics Design', icon: 'image', used: 12, total: 15, unit_label: 'designs', warning_threshold: 20 },
      { deliverable_type: 'video_edit', label: 'Video Edit', icon: 'video', used: 6, total: 8, unit_label: 'videos', warning_threshold: 20 },
      { deliverable_type: 'copywriting', label: 'Copywriting', icon: 'pen-tool', used: 18, total: 25, unit_label: 'copies', warning_threshold: 20 },
      { deliverable_type: 'boost_campaign', label: 'Boost Campaign', icon: 'rocket', used: 4, total: 5, unit_label: 'campaigns', warning_threshold: 20 },
    ],
    status: 'active',
    healthScore: 88,
    wallet: {
      balance: 95000,
      currency: 'BDT'
    }
  }
];

export const mockActivities: Activity[] = [
  {
    id: 'act-1',
    clientId: 'client-1',
    type: 'deliverable_created',
    title: 'Design Deliverable Created',
    description: 'Customer Frame Design for Royal Enfield Meteor',
    timestamp: '2024-01-15T10:30:00Z',
    metadata: {
      deliverableType: 'Customer Frame'
    }
  },
  {
    id: 'act-2',
    clientId: 'client-1',
    type: 'boost_launched',
    title: 'Boost Campaign Launched',
    description: 'Meta Ads - New Year Sale Campaign',
    timestamp: '2024-01-14T14:20:00Z',
    metadata: {
      platform: 'Meta',
      amount: 15000,
      currency: 'BDT'
    }
  },
  {
    id: 'act-3',
    clientId: 'client-1',
    type: 'payment_received',
    title: 'Payment Received',
    description: 'Monthly package fee payment',
    timestamp: '2024-01-01T09:00:00Z',
    metadata: {
      amount: 85000,
      currency: 'BDT',
      status: 'completed'
    }
  },
  {
    id: 'act-4',
    clientId: 'client-1',
    type: 'approval_given',
    title: 'Approval Given',
    description: 'Review Video approved for publication',
    timestamp: '2024-01-13T16:45:00Z'
  },
  {
    id: 'act-5',
    clientId: 'client-2',
    type: 'deliverable_created',
    title: 'Video Deliverable Created',
    description: 'Food Reel - Biryani Special',
    timestamp: '2024-01-12T11:15:00Z',
    metadata: {
      deliverableType: 'Food Reel'
    }
  },
  {
    id: 'act-6',
    clientId: 'client-2',
    type: 'revision_requested',
    title: 'Revision Requested',
    description: 'Menu poster design revision needed',
    timestamp: '2024-01-11T13:30:00Z'
  },
  {
    id: 'act-7',
    clientId: 'client-3',
    type: 'invoice_generated',
    title: 'Invoice Generated',
    description: 'Monthly package invoice #INV-2024-003',
    timestamp: '2024-01-10T08:00:00Z',
    metadata: {
      amount: 18000,
      currency: 'BDT',
      status: 'pending'
    }
  },
  {
    id: 'act-8',
    clientId: 'client-4',
    type: 'boost_launched',
    title: 'Boost Campaign Launched',
    description: 'Google Ads - Showroom Visit Campaign',
    timestamp: '2024-01-09T15:00:00Z',
    metadata: {
      platform: 'Google',
      amount: 20000,
      currency: 'BDT'
    }
  }
];

export const mockPerformance: Record<string, ClientPerformance> = {
  'client-1': {
    clientId: 'client-1',
    postsPublished: 24,
    reelsPublished: 8,
    customerFramesDelivered: 15,
    reviewVideosDelivered: 6,
    adSpendThisMonth: 45000,
    leadsGenerated: 127,
    testRideBookings: 43,
    period: {
      start: '2024-01-01',
      end: '2024-01-31'
    }
  },
  'client-4': {
    clientId: 'client-4',
    postsPublished: 18,
    reelsPublished: 6,
    customerFramesDelivered: 12,
    reviewVideosDelivered: 4,
    adSpendThisMonth: 38000,
    leadsGenerated: 89,
    testRideBookings: 31,
    period: {
      start: '2024-01-01',
      end: '2024-01-31'
    }
  }
};
