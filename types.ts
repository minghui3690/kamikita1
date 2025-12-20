
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER',
}

export interface User {
  id: string;
  name: string;
  username?: string; // [NEW]
  email: string;
  role: UserRole;
  referralCode: string;
  uplineId: string | null;
  walletBalance: number; // Acts as Total Points
  totalEarnings: number; // Lifetime accumulated points
  joinedAt: string;
  password?: string;
  avatar?: string;
  isActive: boolean;
  isKakaUnlocked?: boolean; // New field for KAKA access
  isHumanDesignUnlocked?: boolean; // New field for HD access
  isAiAssistantUnlocked?: boolean; // [NEW] AI Access
  membershipExpiryDate?: string; // [NEW] Membership Expiry ISO String
  kyc: {
    phone: string;
    address: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    isVerified: boolean;
    gender: 'Man' | 'Woman' | '';
    birthDate: string;
    birthCity: string;
    birthTime: string; // HH:mm
    withdrawalMethods?: ManualPaymentMethod[]; // Saved withdrawal destinations
  };
}

export interface Product {
  id: string;
  name: string; // [NEW] Added for consistency with nameproduct
  nameproduct: string; // [RENAMED]
  price: number;
  points: number;
  description: string;
  image?: string;
  pdfUrl?: string; // Link to digital product
  customRedirectUrl?: string; // URL to redirect after purchase
  isConsultation?: boolean;
  consultationQuota?: number;
  activeDays?: number; // [NEW] Duration in days
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Voucher {
  id: string;
  code: string;
  discountPercent: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  items: CartItem[];
  
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  pointsRedeemed: number;
  pointsRedeemedValue: number;
  totalAmount: number;
  
  totalPointsEarned: number;
  
  status: 'PENDING' | 'PAID';
  paymentMethod: 'BANK_TRANSFER' | 'GATEWAY' | 'POINT_CUT';
  paymentProof?: string;
  timestamp: string;
  commissionsDistributed: boolean;
  voucherCode?: string;
  isArchived?: boolean; // New field
}

export interface CommissionLog {
  id: string;
  transactionId: string;
  beneficiaryId: string;
  sourceUserId: string;
  level: number;
  amount: number;
  timestamp: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  bankDetails: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestDate: string;
  processDate?: string;
  adminProofImage?: string;
  adminProofLink?: string;
  rejectionReason?: string;
  isArchived?: boolean; // New field
}

export interface Announcement {
  id: string;
  title: string;
  date: string;
  content: string;
  image?: string;
}

// New Interface for KAKA
export interface KakaItem {
  id: string;
  date: string;
  description: string;
  mediaType: 'PHOTO' | 'LINK' | 'FILE' | 'NONE';
  mediaUrl?: string;
  mediaName?: string; // For file name display
}

// HUMAN DESIGN STRUCTURES
export interface HDPlanetaryData {
  sun: string;
  earth: string;
  northNode: string;
  southNode: string;
  moon: string;
  mercury: string;
  venus: string;
  mars: string;
  jupiter: string;
  saturn: string;
  uranus: string;
  neptune: string;
  pluto: string;
  chiron?: string;
  lilith?: string; // Added Lilith
}

export interface HDCenters {
  head: string; // Defined / Undefined / Open
  ajna: string;
  throat: string;
  gCenter: string;
  heart: string;
  sacral: string;
  root: string;
  spleen: string;
  solarPlexus: string;
}

export interface HumanDesignProfile {
  id: string;
  userId: string;
  chartImage: string;
  
  // Scanned Bio Data
  chartName?: string;
  chartBirthDate?: string;
  chartBirthTime?: string;
  chartBirthCity?: string;
  chartDesignDate?: string; // [NEW]

  // Basic Info
  type: string;
  profile: string;
  authority: string;
  strategy: string;
  definition: string;
  signature: string; // Purpose/Characteristic
  notSelfTheme: string; // Emotional Theme
  incarnationCross: string;
  
  // Variables (New Fields from Screenshot)
  digestion?: string; // Sistem Pencernaan
  sense?: string; // Kepekaan
  designSense?: string; // Kepekaan Tak Sadar [NEW]
  motivation?: string; // Motivasi
  perspective?: string; // Perspektif
  environment?: string; // Lingkungan
  
  // Detailed Data
  design: HDPlanetaryData; // Red Column
  personality: HDPlanetaryData; // Black Column
  centers: HDCenters;
  channels: string[]; // Array of strings like "10-34 Exploration..."

  updatedAt: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  image: string;
}

export interface BrandingConfig {
  appTitle: string;
  appSubtitle: string;
  logo: string;
  theme: {
    cardBackground: string;
    cardText: string;
  };
}

export interface FeatureBox {
  id: string;
  title: string;
  description: string;
  icon: 'star' | 'users' | 'trending';
}

export interface SocialLink {
  name: string;
  url: string;
}

export interface MidtransConfig {
  merchantId: string;
  clientKey: string;
  serverKey: string;
  isProduction: boolean;
  snapUrl: string;
}

export interface ManualPaymentMethod {
  id: string;
  type: 'BANK' | 'EWALLET';
  name: string; // "BCA", "OVO", "GoPay"
  accountNumber: string;
  accountHolder: string;
  logo?: string; 
  isActive: boolean;
}

export interface QRISConfig {
  image: string;
  nmid?: string;
}

export interface SystemSettings {
  commissionLevels: number;
  levelPercentages: number[];
  pointRate: number;
  taxPercentage: number;
  announcements: Announcement[]; 
  branding: BrandingConfig;
  productPage: {
    title: string;
    subtitle: string;
  };
  landingPage: {
    title: string;
    description: string;
    backgroundImage: string;
    logo: string; // Keep for legacy or sync
    textColor: string;
    heroAlignment: 'left' | 'center' | 'right';
    features: {
      title: string; // "Why Choose Us" Title
      description: string; // "Why Choose Us" Subtitle
    };
    featureBoxes: FeatureBox[]; // The 3 boxes
    testimonials: Testimonial[];
    footer: {
      aboutText: string;
      contactEmail: string;
      contactPhone: string;
      copyrightText: string;
      socialMedia: {
        facebook: string;
        instagram: string;
        whatsapp: string;
        tiktok: string;
        youtube?: string;
        telegram?: string;
        others?: SocialLink[];
      };
    };
  };
  paymentConfig: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    qrisImage: string; // Legacy
    
    // New Extended Config
    qris?: QRISConfig;
    manualMethods?: ManualPaymentMethod[];
    
    paymentGatewayKey: string; // Legacy
    gatewayEnabled: boolean;
    midtrans: MidtransConfig;
  };
  memberProfileConfig?: {
    showBirthDetails: boolean;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
