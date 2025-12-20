
// ... (Imports remain the same, ensure HDPlanetaryData, HDCenters, HumanDesignProfile are imported)
import { User, UserRole, Product, Transaction, CommissionLog, SystemSettings, CartItem, WithdrawalRequest, Voucher, Announcement, Testimonial, FeatureBox, KakaItem, HumanDesignProfile, HDPlanetaryData, HDCenters } from '../types';

// ... (KEYS and Helper functions remain the same)
const KEYS = {
  USERS: 'rda_users',
  PRODUCTS: 'rda_products',
  TRANSACTIONS: 'rda_transactions',
  COMMISSIONS: 'rda_commissions',
  SETTINGS: 'rda_settings',
  WITHDRAWALS: 'rda_withdrawals',
  VOUCHERS: 'rda_vouchers',
  KAKA: 'rda_kaka',
  HUMAN_DESIGN: 'rda_human_design',
};

const getStorage = <T>(key: string, defaultVal: T): T => {
  const stored = localStorage.getItem(key);
  if (!stored) return defaultVal;
  try {
    return JSON.parse(stored);
  } catch {
    return defaultVal;
  }
};

const setStorage = (key: string, val: any) => {
  localStorage.setItem(key, JSON.stringify(val));
};

// ... (DEFAULT_SETTINGS, DEFAULT_PRODUCTS, DEFAULT_ADMIN remain the same)
const DEFAULT_SETTINGS: SystemSettings = {
  commissionLevels: 2,
  levelPercentages: [20, 5],
  pointRate: 1,
  taxPercentage: 11,
  announcements: [
    { id: '1', title: 'Welcome to Rich Dragon', date: new Date().toISOString(), content: 'Welcome to our new system! We are excited to have you on board.' },
    { id: '2', title: 'System Maintenance', date: new Date(Date.now() - 86400000).toISOString(), content: 'Routine maintenance is scheduled for next Sunday at 02:00 AM.' },
    { id: '3', title: 'New Product Launch', date: new Date(Date.now() - 172800000).toISOString(), content: 'Check out our new Diamond Package with enhanced benefits!' }
  ],
  branding: {
    appTitle: 'Rich Dragon Academy',
    appSubtitle: 'Build Your Destiny',
    logo: '',
    theme: {
      cardBackground: '#ffffff',
      cardText: '#1f2937'
    }
  },
  productPage: {
    title: 'Produk Kami',
    subtitle: 'High quality digital products'
  },
  landingPage: {
    title: 'Build Your Future',
    description: 'Join the fastest growing network.',
    backgroundImage: 'https://images.pexels.com/photos/7888985/pexels-photo-7888985.jpeg',
    logo: '',
    textColor: '#ffffff',
    heroAlignment: 'center',
    features: {
      title: 'Mengapa Bergabung Dengan Kami',
      description: 'We provide the best tools for your success.'
    },
    featureBoxes: [
      { id: '1', title: 'Mudah Untuk Memulai', description: 'Daftar dan mulai mendapatkan berbagai manfaat luarbiasa.', icon: 'star' },
      { id: '2', title: 'Komunitas', description: 'Bergabung dengan Orang-Orang Positif dan Senang Berbagi Kebaikan', icon: 'users' },
      { id: '3', title: 'Reward', description: 'Dapatkan poin dan cairkan menjadi uang cash.', icon: 'trending' }
    ],
    testimonials: [],
    footer: {
      aboutText: 'Platform Berbagi Kebaikan.',
      contactEmail: 'support@richdragon.id',
      contactPhone: '+62 812 3456 7890',
      copyrightText: 'All rights reserved.',
      socialMedia: {
        facebook: 'https://facebook.com',
        instagram: 'https://instagram.com',
        whatsapp: 'https://wa.me/',
        tiktok: 'https://tiktok.com',
        telegram: 'https://telegram.org'
      }
    }
  },
  paymentConfig: {
    bankName: 'BCA',
    accountNumber: '8375280201',
    accountHolder: 'Hendrawan',
    qrisImage: '',
    paymentGatewayKey: '',
    gatewayEnabled: false,
    midtrans: {
      merchantId: '',
      clientKey: '',
      serverKey: '',
      isProduction: false,
      snapUrl: ''
    }
  }
};

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p1', nameproduct: 'HD Simpliefied Report', price: 100000, points: 100000, description: 'Ringkasan Report Human Design Anda.', image: 'https://placehold.co/400' },
  { id: 'p2', nameproduct: 'Konsultasi HD Simplified Report', price: 500000, points: 500000, description: 'Paket Konsultasi Human Design Anda.', image: 'https://placehold.co/400' },
];

const DEFAULT_ADMIN: User = {
  id: 'admin',
  name: 'Super Admin',
  email: 'admin@richdragon.com',
  password: 'admin123',
  role: UserRole.ADMIN,
  referralCode: 'ADMIN',
  uplineId: null,
  walletBalance: 0,
  totalEarnings: 0,
  joinedAt: new Date().toISOString(),
  isActive: true,
  kyc: {
    phone: '', address: '', bankName: '', accountNumber: '', accountHolder: '', isVerified: true,
    gender: 'Man', birthDate: '', birthCity: '', birthTime: ''
  }
};

export const seedData = () => {
  // ... (Seeding logic remains same)
  let currentSettings = getStorage<SystemSettings | null>(KEYS.SETTINGS, null);
  if (!currentSettings) {
      setStorage(KEYS.SETTINGS, DEFAULT_SETTINGS);
  } else {
      currentSettings.commissionLevels = 2;
      currentSettings.levelPercentages = [20, 5];
      if (!currentSettings.pointRate) currentSettings.pointRate = 1;
      if (currentSettings.announcements.length < 3) {
          currentSettings.announcements = DEFAULT_SETTINGS.announcements;
      }
      if (!currentSettings.landingPage.footer.socialMedia.facebook) {
          currentSettings.landingPage.footer.socialMedia = DEFAULT_SETTINGS.landingPage.footer.socialMedia;
      }
      if (!currentSettings.branding || !currentSettings.branding.theme) {
          currentSettings.branding = { ...DEFAULT_SETTINGS.branding, ...currentSettings.branding };
          if (!currentSettings.branding.theme) {
              currentSettings.branding.theme = DEFAULT_SETTINGS.branding.theme;
          }
      }
      setStorage(KEYS.SETTINGS, currentSettings);
  }

  let storedProducts = getStorage<Product[] | null>(KEYS.PRODUCTS, null);
  if (!storedProducts) {
      setStorage(KEYS.PRODUCTS, DEFAULT_PRODUCTS);
  } else {
      const updatedProducts = storedProducts.map(p => {
          // Force update p1 and p2 to match new defaults
          if (p.id === 'p1') return { ...p, ...DEFAULT_PRODUCTS.find(dp => dp.id === 'p1') };
          if (p.id === 'p2') return { ...p, ...DEFAULT_PRODUCTS.find(dp => dp.id === 'p2') };
          return p;
      });
      setStorage(KEYS.PRODUCTS, updatedProducts);
  }

  if (!localStorage.getItem(KEYS.VOUCHERS)) setStorage(KEYS.VOUCHERS, []);
  if (!localStorage.getItem(KEYS.KAKA)) setStorage(KEYS.KAKA, []);
  if (!localStorage.getItem(KEYS.HUMAN_DESIGN)) setStorage(KEYS.HUMAN_DESIGN, []);

  let users = getStorage<User[]>(KEYS.USERS, []);
  
  // Force update Admin
  const adminIndex = users.findIndex(u => u.email === DEFAULT_ADMIN.email);
  if (adminIndex !== -1) {
      users[adminIndex] = {
          ...users[adminIndex],
          ...DEFAULT_ADMIN, // Sync all default admin properties
          id: users[adminIndex].id // Preserve ID just in case (though should be same)
      };
  } else {
      users.push(DEFAULT_ADMIN);
  }
  setStorage(KEYS.USERS, users);
};

// ... (Get/Save functions for Settings, Products, Users remain same)
export const getSettings = (): SystemSettings => getStorage(KEYS.SETTINGS, DEFAULT_SETTINGS);
export const saveSettings = (s: SystemSettings) => setStorage(KEYS.SETTINGS, s);
export const getProducts = (): Product[] => getStorage(KEYS.PRODUCTS, DEFAULT_PRODUCTS);
export const saveProducts = (p: Product[]) => {
    setStorage(KEYS.PRODUCTS, p);
    window.dispatchEvent(new Event('rda_products_updated'));
};
export const getUsers = (): User[] => getStorage(KEYS.USERS, [DEFAULT_ADMIN]);
const saveUsers = (u: User[]) => setStorage(KEYS.USERS, u);

// ... (loginUser, registerUser, updateUserProfile, toggleUserStatus, deleteUser, getMemberTree, getDownlineDetails, getNetworkStats remain same)
export const loginUser = (email: string, pass: string): User => {
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
  if (!user) throw new Error('Invalid credentials');
  if (!user.isActive) throw new Error('Account is inactive');
  return user;
};

export const registerUser = (name: string, email: string, pass: string, refCode?: string): User => {
  const users = getUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) throw new Error('Email already exists');
  
  let uplineId = null;
  if (refCode) {
    const upline = users.find(u => u.referralCode === refCode);
    if (upline) uplineId = upline.id;
  } else {
    uplineId = 'admin';
  }

  const newUser: User = {
    id: 'u' + Date.now(),
    name,
    email,
    password: pass,
    role: UserRole.MEMBER,
    referralCode: 'RDA' + Math.floor(Math.random() * 100000),
    uplineId,
    walletBalance: 0,
    totalEarnings: 0,
    joinedAt: new Date().toISOString(),
    isActive: true,
    kyc: {
      phone: '', address: '', bankName: '', accountNumber: '', accountHolder: '', isVerified: false,
      gender: 'Man', birthDate: '', birthCity: '', birthTime: ''
    }
  };
  
  users.push(newUser);
  saveUsers(users);
  return newUser;
};

export const updateUserProfile = (userId: string, updates: Partial<User>) => {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updates };
    saveUsers(users);
  }
};

export const toggleUserStatus = (userId: string) => {
    const users = getUsers();
    const u = users.find(x => x.id === userId);
    if(u) {
        u.isActive = !u.isActive;
        saveUsers(users);
    }
};

export const deleteUser = (userId: string) => {
    let users = getUsers();
    users = users.filter(u => u.id !== userId);
    saveUsers(users);
};

export const getMemberTree = (rootId: string) => {
    const users = getUsers();
    const buildTree = (id: string): any => {
        const user = users.find(u => u.id === id);
        if (!user) return null;
        const children = users.filter(u => u.uplineId === id).map(u => buildTree(u.id));
        return { ...user, children };
    };
    return buildTree(rootId);
};

export const getDownlineDetails = (userId: string) => {
    const users = getUsers();
    const transactions = getTransactions();
    const downlines: any[] = [];
    const traverse = (currentId: string, level: number) => {
        const direct = users.filter(u => u.uplineId === currentId);
        direct.forEach(d => {
            const userTx = transactions.filter(t => t.userId === d.id);
            const totalSales = userTx.reduce((sum, t) => sum + t.totalAmount, 0);
            downlines.push({
                ...d,
                level,
                totalSales,
                products: userTx.reduce((sum, t) => sum + t.items.length, 0)
            });
            traverse(d.id, level + 1);
        });
    };
    traverse(userId, 1);
    return downlines;
};

export const getNetworkStats = (userId: string) => {
    const users = getUsers();
    const direct = users.filter(u => u.uplineId === userId).length;
    let count = 0;
    const countGroup = (id: string) => {
        const children = users.filter(u => u.uplineId === id);
        count += children.length;
        children.forEach(c => countGroup(c.id));
    };
    countGroup(userId);
    return { frontline: direct, groupCount: count };
};

// ... (Transactions, Commissions, Sales Stats, Withdrawals, Vouchers, Kaka logic remain the same)
export const getTransactions = (): Transaction[] => getStorage(KEYS.TRANSACTIONS, []);
export const saveTransactions = (t: Transaction[]) => setStorage(KEYS.TRANSACTIONS, t);
export const getCommissions = (): CommissionLog[] => getStorage(KEYS.COMMISSIONS, []);
const saveCommissions = (c: CommissionLog[]) => setStorage(KEYS.COMMISSIONS, c);

const distributeCommissions = (sourceUser: User, purchaseAmount: number, transactionId: string) => {
    const settings = getSettings();
    const users = getUsers();
    const commissions: CommissionLog[] = [];
    const logs = getCommissions();
    let currentUplineId = sourceUser.uplineId;
    let level = 0;
    while (currentUplineId && level < settings.commissionLevels) {
        const upline = users.find(u => u.id === currentUplineId);
        if (!upline) break;
        const percent = settings.levelPercentages[level] || 0;
        if (percent > 0) {
             const commAmount = purchaseAmount * (percent / 100);
             upline.walletBalance += commAmount;
             upline.totalEarnings += commAmount;
             commissions.push({
                 id: 'c' + Date.now() + level,
                 transactionId,
                 beneficiaryId: upline.id,
                 sourceUserId: sourceUser.id,
                 level: level + 1,
                 amount: commAmount,
                 timestamp: new Date().toISOString()
             });
        }
        currentUplineId = upline.uplineId;
        level++;
    }
    saveUsers(users);
    saveCommissions([...logs, ...commissions]);
};

export const processMultiCartPurchase = (userId: string, items: CartItem[], paymentMethod: 'BANK_TRANSFER' | 'GATEWAY' | 'POINT_CUT', voucherCode?: string, pointsRedeemed: number = 0, paymentProof?: string) => {
    const users = getUsers();
    const settings = getSettings();
    let user = users.find(u => u.id === userId);
    
    // Failsafe: Reload from storage if user not found in current memory state
    if (!user) {
        const freshUsers = getStorage(KEYS.USERS, []);
        user = freshUsers.find((u: User) => u.id === userId);
    }

    if (!user) {
        console.error('Purchase failed: User ID not found', userId);
        throw new Error(`User authentication error (ID: ${userId}). Please logout and login again.`);
    }
    const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const totalPoints = items.reduce((sum, item) => sum + (item.product.points * item.quantity), 0);
    let discount = 0;
    if (voucherCode) {
        const vouchers = getVouchers();
        const voucher = vouchers.find(v => v.code === voucherCode && v.isActive);
        if (voucher) discount = subtotal * (voucher.discountPercent / 100);
    }
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * (settings.taxPercentage / 100);
    const totalWithTax = afterDiscount + tax;
    const pointsValue = pointsRedeemed * settings.pointRate;
    const finalTotal = Math.max(0, totalWithTax - pointsValue);
    if (pointsRedeemed > 0) {
        if (user.walletBalance < pointsRedeemed) throw new Error('Insufficient points');
        user.walletBalance -= pointsRedeemed;
    }
    const tx: Transaction = {
        id: 'tx' + Date.now(),
        userId: user.id,
        userName: user.name,
        items,
        subtotal,
        discountAmount: discount,
        taxAmount: tax,
        pointsRedeemed,
        pointsRedeemedValue: pointsValue,
        totalAmount: finalTotal,
        totalPointsEarned: totalPoints,
        status: 'PAID',
        paymentMethod,
        paymentProof,
        timestamp: new Date().toISOString(),
        commissionsDistributed: true,
        voucherCode,
        isArchived: false
    };
    const allTx = getTransactions();
    allTx.push(tx);
    saveTransactions(allTx);
    saveUsers(users);
    if (totalPoints > 0) distributeCommissions(user, totalPoints, tx.id);
};

export const processGuestCheckout = (name: string, email: string, referralCode: string | undefined, product: Product, method: 'BANK_TRANSFER' | 'GATEWAY', voucherCode?: string): User => {
    let users = getUsers();
    let user = users.find(u => u.email === email);
    if (!user) {
        try { user = registerUser(name, email, 'password123', referralCode); } catch (e) { throw e; }
    }
    const cartItem: CartItem = { product, quantity: 1 };
    processMultiCartPurchase(user.id, [cartItem], method, voucherCode);
    return user;
};

export const getSalesStats = (period: 'weekly' | 'monthly' | 'yearly') => {
    const tx = getTransactions().filter(t => t.status === 'PAID');
    const data: { label: string, amount: number }[] = [];
    const now = new Date();
    if (period === 'weekly') {
        for(let i=6; i>=0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const label = d.toLocaleDateString('en-US', { weekday: 'short' });
            const amount = tx.filter(t => new Date(t.timestamp).toDateString() === d.toDateString()).reduce((sum, t) => sum + t.totalAmount, 0);
            data.push({ label, amount });
        }
    } else if (period === 'monthly') {
         for(let i=5; i>=0; i--) {
             const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
             const label = d.toLocaleDateString('en-US', { month: 'short' });
             const amount = tx.filter(t => {
                 const td = new Date(t.timestamp);
                 return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
             }).reduce((sum, t) => sum + t.totalAmount, 0);
             data.push({ label, amount });
         }
    } else {
        for(let i=4; i>=0; i--) {
            const year = now.getFullYear() - i;
            const amount = tx.filter(t => new Date(t.timestamp).getFullYear() === year).reduce((sum, t) => sum + t.totalAmount, 0);
            data.push({ label: year.toString(), amount });
        }
    }
    return data;
};

export const getWithdrawals = (): WithdrawalRequest[] => getStorage(KEYS.WITHDRAWALS, []);
export const saveWithdrawals = (w: WithdrawalRequest[]) => setStorage(KEYS.WITHDRAWALS, w);
export const requestWithdrawal = (userId: string, amount: number) => {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    const settings = getSettings();
    const maxRp = user.walletBalance * settings.pointRate;
    if (amount > maxRp) throw new Error('Insufficient balance');
    const req: WithdrawalRequest = {
        id: 'wd' + Date.now(),
        userId,
        userName: user.name,
        amount,
        bankDetails: `${user.kyc.bankName} - ${user.kyc.accountNumber} (${user.kyc.accountHolder})`,
        status: 'PENDING',
        requestDate: new Date().toISOString(),
        isArchived: false
    };
    const wds = getWithdrawals();
    wds.push(req);
    saveWithdrawals(wds);
};

export const processWithdrawal = (id: string, status: 'APPROVED' | 'REJECTED', proof?: string, link?: string, reason?: string) => {
    const wds = getWithdrawals();
    const idx = wds.findIndex(w => w.id === id);
    if (idx === -1) return;
    const req = wds[idx];
    if (req.status !== 'PENDING') return;
    req.status = status;
    req.processDate = new Date().toISOString();
    req.adminProofImage = proof;
    req.adminProofLink = link;
    req.rejectionReason = reason;
    if (status === 'APPROVED') {
        const users = getUsers();
        const user = users.find(u => u.id === req.userId);
        if (user) {
            const settings = getSettings();
            const pointsToDeduct = req.amount / settings.pointRate;
            user.walletBalance -= pointsToDeduct;
            saveUsers(users);
        }
    }
    saveWithdrawals(wds);
};

export const getVouchers = (): Voucher[] => getStorage(KEYS.VOUCHERS, []);
export const saveVouchers = (v: Voucher[]) => setStorage(KEYS.VOUCHERS, v);
export const getKakaItems = (): KakaItem[] => getStorage(KEYS.KAKA, []);
export const saveKakaItems = (k: KakaItem[]) => setStorage(KEYS.KAKA, k);

// --- Human Design ---
export const getHumanDesignProfiles = (): HumanDesignProfile[] => getStorage(KEYS.HUMAN_DESIGN, []);
export const saveHumanDesignProfiles = (p: HumanDesignProfile[]) => setStorage(KEYS.HUMAN_DESIGN, p);

// Helper for Mock OCR randomness
const randGate = () => Math.floor(Math.random() * 64) + 1;
const randLine = () => Math.floor(Math.random() * 6) + 1;
const randSymbol = () => {
    const r = Math.random();
    if (r > 0.8) return ' ▲';
    if (r > 0.6) return ' ▼';
    if (r > 0.5) return ' ★';
    return '';
}
const genPlanet = () => `${randGate()}.${randLine()}${randSymbol()}`;

export const performMockOCR = (fileOrUrl: any): Promise<Partial<HumanDesignProfile>> => {
    return new Promise((resolve) => {
        // Randomize mock processing time
        const delay = 2000 + Math.random() * 2000;
        
        setTimeout(() => {
            // Generate Random Dynamic Data for "Different File" Simulation
            const design: HDPlanetaryData = {
                sun: genPlanet(), earth: genPlanet(), northNode: genPlanet(), southNode: genPlanet(), 
                moon: genPlanet(), mercury: genPlanet(), venus: genPlanet(), mars: genPlanet(), 
                jupiter: genPlanet(), saturn: genPlanet(), uranus: genPlanet(), neptune: genPlanet(), 
                pluto: genPlanet(), chiron: genPlanet(), lilith: genPlanet()
            };

            const personality: HDPlanetaryData = {
                sun: genPlanet(), earth: genPlanet(), northNode: genPlanet(), southNode: genPlanet(), 
                moon: genPlanet(), mercury: genPlanet(), venus: genPlanet(), mars: genPlanet(), 
                jupiter: genPlanet(), saturn: genPlanet(), uranus: genPlanet(), neptune: genPlanet(), 
                pluto: genPlanet(), chiron: genPlanet(), lilith: genPlanet()
            };

            const centers: HDCenters = {
                head: Math.random() > 0.5 ? 'Defined' : 'Undefined',
                ajna: Math.random() > 0.5 ? 'Defined' : 'Undefined',
                throat: Math.random() > 0.5 ? 'Defined' : 'Undefined',
                gCenter: Math.random() > 0.5 ? 'Defined' : 'Undefined',
                heart: Math.random() > 0.5 ? 'Defined' : 'Undefined',
                sacral: Math.random() > 0.5 ? 'Defined' : 'Undefined',
                root: Math.random() > 0.5 ? 'Defined' : 'Undefined',
                spleen: Math.random() > 0.5 ? 'Defined' : 'Undefined',
                solarPlexus: Math.random() > 0.5 ? 'Defined' : 'Undefined',
            };

            const types = ['GENERATOR', 'MANIFESTING GENERATOR', 'PROJECTOR', 'REFLECTOR', 'MANIFESTOR'];
            const profiles = ['1/3', '1/4', '2/4', '2/5', '3/5', '3/6', '4/6', '4/1', '5/1', '5/2', '6/2', '6/3'];
            const randomType = types[Math.floor(Math.random() * types.length)];
            
            // If file is passed, try to use filename, else random name
            let scannedName = 'Scanned Member';
            // Simple mock: if fileOrUrl is string (url from previous step) it might contain name
            // For now just randomizing slightly
            scannedName = 'Member_' + Math.floor(Math.random()*1000);

            resolve({
                chartName: scannedName,
                chartBirthDate: `19${Math.floor(Math.random()*50)+50}-0${Math.floor(Math.random()*9)+1}-15`,
                chartBirthTime: `${Math.floor(Math.random()*23)}:${Math.floor(Math.random()*59)}`,
                chartBirthCity: 'Jakarta, Indonesia', // Default mock
                
                type: randomType,
                profile: profiles[Math.floor(Math.random() * profiles.length)] + ' Profile',
                authority: 'Emotional - Solar Plexus',
                strategy: 'Menunggu Untuk Merespons',
                definition: 'Split Definition',
                signature: 'Kepuasan', 
                notSelfTheme: 'Frustrasi',
                incarnationCross: 'RIGHT ANGLE CROSS OF THE VESSEL OF LOVE',
                
                digestion: 'Calm (Tenang)',
                sense: 'Meditation (Meditasi)',
                motivation: 'Desire (Keinginan)',
                perspective: 'Possibility (Kemungkinan)',
                environment: 'Valleys (Dataran Rendah)',

                design,
                personality,
                centers,
                channels: [
                    `${randGate()} - ${randGate()} : Random Channel A`,
                    `${randGate()} - ${randGate()} : Random Channel B`
                ],
                chartImage: typeof fileOrUrl === 'string' ? fileOrUrl : 'https://placehold.co/400x600?text=Processed+Chart'
            });
        }, delay);
    });
};

export const getHumanDesignByUserId = (userId: string): HumanDesignProfile | undefined => {
    const profiles = getHumanDesignProfiles();
    return profiles.find(p => p.userId === userId);
};

// ... (toggleKakaAccess, grantManualAccess, updateUserAccess, deleteUserAccess, getCombinedActions, archiveActions, unhideActions, deleteActions remain same)
export const toggleKakaAccess = (userId: string) => {
    const users = getUsers();
    const u = users.find(x => x.id === userId);
    if(u) {
        u.isKakaUnlocked = !u.isKakaUnlocked;
        saveUsers(users);
    }
};

export const grantManualAccess = (userId: string, fileName: string, fileUrl: string) => {
    const product: Product = {
        id: 'manual_' + Date.now(),
        nameproduct: fileName,
        price: 0,
        points: 0,
        description: 'Manual Access Grant',
        pdfUrl: fileUrl
    };
    const item: CartItem = { product, quantity: 1 };
    const tx: Transaction = {
        id: 'grant_' + Date.now(),
        userId,
        userName: 'System Grant',
        items: [item],
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        pointsRedeemed: 0,
        pointsRedeemedValue: 0,
        totalAmount: 0,
        totalPointsEarned: 0,
        status: 'PAID',
        paymentMethod: 'POINT_CUT',
        timestamp: new Date().toISOString(),
        commissionsDistributed: true
    };
    const allTx = getTransactions();
    allTx.push(tx);
    saveTransactions(allTx);
};

export const updateUserAccess = (userId: string, productId: string, newUrl: string, newName: string) => {
    const allTx = getTransactions();
    let updated = false;
    allTx.forEach(t => {
        if (t.userId === userId) {
            t.items.forEach(i => {
                if (i.product.id === productId) {
                    i.product.pdfUrl = newUrl;
                    i.product.nameproduct = newName;
                    updated = true;
                }
            });
        }
    });
    if (updated) saveTransactions(allTx);
};

export const deleteUserAccess = (userId: string, productId: string) => {
    let allTx = getTransactions();
    allTx = allTx.map(t => {
        if (t.userId === userId) {
            const newItems = t.items.filter(i => i.product.id !== productId);
            return { ...t, items: newItems };
        }
        return t;
    }).filter(t => t.items.length > 0);
    saveTransactions(allTx);
};

export const getCombinedActions = (user: User, showArchived: boolean = false) => {
    const isAdmin = user.role === UserRole.ADMIN;
    const users = getUsers();
    let relevantUserIds = [user.id];
    if (isAdmin) {
        relevantUserIds = users.map(u => u.id);
    } else {
        const downlines = getDownlineDetails(user.id);
        relevantUserIds = [user.id, ...downlines.map((d: any) => d.id)];
    }
    const txs = getTransactions().filter(t => 
        relevantUserIds.includes(t.userId) && (showArchived ? t.isArchived : !t.isArchived)
    );
    const wds = getWithdrawals().filter(w => 
        relevantUserIds.includes(w.userId) && (showArchived ? w.isArchived : !w.isArchived)
    );
    const actions = [
        ...txs.map(t => ({
            id: t.id,
            type: 'PURCHASE',
            originalType: 'TRANSACTION',
            date: t.timestamp,
            userId: t.userId,
            userName: t.userName,
            description: t.items.map(i => i.product.nameproduct).join(', '),
            amount: t.totalAmount,
            status: t.status,
            isArchived: t.isArchived
        })),
        ...wds.map(w => ({
            id: w.id,
            type: 'WITHDRAWAL',
            originalType: 'WITHDRAWAL',
            date: w.requestDate,
            userId: w.userId,
            userName: w.userName,
            description: w.bankDetails,
            amount: w.amount,
            status: w.status,
            isArchived: w.isArchived
        }))
    ];
    return actions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const archiveActions = (ids: string[]) => {
    let txs = getTransactions();
    txs = txs.map(t => ids.includes(t.id) ? { ...t, isArchived: true } : t);
    saveTransactions(txs);
    let wds = getWithdrawals();
    wds = wds.map(w => ids.includes(w.id) ? { ...w, isArchived: true } : w);
    saveWithdrawals(wds);
};

export const unhideActions = (ids: string[]) => {
    let txs = getTransactions();
    txs = txs.map(t => ids.includes(t.id) ? { ...t, isArchived: false } : t);
    saveTransactions(txs);
    let wds = getWithdrawals();
    wds = wds.map(w => ids.includes(w.id) ? { ...w, isArchived: false } : w);
    saveWithdrawals(wds);
};

export const deleteActions = (ids: string[]) => {
    let txs = getTransactions();
    txs = txs.filter(t => !ids.includes(t.id));
    saveTransactions(txs);
    let wds = getWithdrawals();
    wds = wds.filter(w => !ids.includes(w.id));
    saveWithdrawals(wds);
};
