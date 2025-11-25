import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('🌱 Starting comprehensive seed for BharatCart...\n');

  // Seed in dependency order
  await seedSettings();
  await seedEmailTemplates();
  await seedFAQs();
  await seedTaxRules();
  await seedShippingZones();
  await seedUsers();
  await seedCategories();
  await seedBrands();
  await seedTags();
  await seedAttributeGroups();
  await seedProducts();
  await seedProductVariants();
  await seedCoupons();
  await seedBanners();
  await seedFlashSales();
  await seedBadges();
  await seedAchievements();
  await seedChallenges();
  await seedQuests();
  await seedLeaderboards();
  await seedSpinWheels();
  await seedBlogPosts();
  await seedContentPages();
  await seedVideoContent();
  await seedNewsletters();
  await seedWarehouses();
  await seedMLModels();
  await seedAIModels();
  await seedDAOProposals();
  await seedInstallmentPlans();
  await seedAuctions();
  await seedMysteryBoxes();
  await seedSubscriptionPlans();
  await seedInfluencerProfiles();
  await seedAffiliateProfiles();
  await seedRentalProducts();
  await seedProductInsurance();
  await seedTradeInPrograms();
  await seedShoppingGroups();
  await seedRegistries();
  await seedFeatureFlags();

  console.log('\n✅ Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log('  - Users: Created');
  console.log('  - Categories: Created');
  console.log('  - Products: Created');
  console.log('  - All 254 models: Ready to use\n');
}

// ============================================================================
// SEED SETTINGS
// ============================================================================

async function seedSettings() {
  console.log('⚙️  Seeding settings...');

  const settings = [
    {
      key: 'SITE_NAME',
      value: 'BharatCart',
      category: 'GENERAL',
      isPublic: true,
      description: 'Website name',
    },
    {
      key: 'SITE_DESCRIPTION',
      value: "India's Premier E-commerce Marketplace",
      category: 'GENERAL',
      isPublic: true,
      description: 'Site meta description',
    },
    {
      key: 'CURRENCY',
      value: 'INR',
      category: 'FINANCIAL',
      isPublic: true,
      description: 'Default currency',
    },
    {
      key: 'TAX_RATE',
      value: 18,
      category: 'FINANCIAL',
      isPublic: false,
      description: 'Default GST rate',
    },
    {
      key: 'SHIPPING_COST',
      value: 50,
      category: 'SHIPPING',
      isPublic: true,
      description: 'Standard shipping cost',
    },
    {
      key: 'FREE_SHIPPING_THRESHOLD',
      value: 500,
      category: 'SHIPPING',
      isPublic: true,
      description: 'Minimum order for free shipping',
    },
    {
      key: 'MIN_ORDER_AMOUNT',
      value: 100,
      category: 'ORDERS',
      isPublic: true,
      description: 'Minimum order amount',
    },
    {
      key: 'LOYALTY_POINTS_RATE',
      value: 0.01,
      category: 'LOYALTY',
      isPublic: false,
      description: 'Points earned per rupee spent',
    },
  ];

  for (const setting of settings) {
    await prisma.setting.create({ data: setting });
  }

  console.log(`  ✓ Created ${settings.length} settings`);
}

// ============================================================================
// SEED EMAIL TEMPLATES
// ============================================================================

async function seedEmailTemplates() {
  console.log('📧 Seeding email templates...');

  const templates = [
    {
      name: 'Order Confirmation',
      slug: 'order-confirmation',
      subject: 'Order Confirmed - {{orderNumber}}',
      body: 'Dear {{userName}}, your order {{orderNumber}} has been confirmed!',
      htmlBody: '<h1>Order Confirmed!</h1><p>Dear {{userName}},</p><p>Your order <strong>{{orderNumber}}</strong> has been confirmed.</p><p>Total: ₹{{orderTotal}}</p>',
      variables: ['userName', 'orderNumber', 'orderTotal'],
      category: 'ORDER',
      isActive: true,
    },
    {
      name: 'Welcome Email',
      slug: 'welcome-email',
      subject: 'Welcome to BharatCart!',
      body: 'Welcome {{userName}}! Thank you for joining BharatCart.',
      htmlBody: '<h1>Welcome to BharatCart!</h1><p>Hi {{userName}},</p><p>Thank you for creating an account.</p>',
      variables: ['userName'],
      category: 'USER',
      isActive: true,
    },
    {
      name: 'Password Reset',
      slug: 'password-reset',
      subject: 'Reset Your Password',
      body: 'Click the link to reset your password: {{resetLink}}',
      htmlBody: '<h1>Password Reset</h1><p>Click <a href="{{resetLink}}">here</a> to reset your password.</p>',
      variables: ['userName', 'resetLink'],
      category: 'SECURITY',
      isActive: true,
    },
  ];

  for (const template of templates) {
    await prisma.emailTemplate.create({ data: template });
  }

  console.log(`  ✓ Created ${templates.length} email templates`);
}

// ============================================================================
// SEED FAQS
// ============================================================================

async function seedFAQs() {
  console.log('❓ Seeding FAQs...');

  const faqs = [
    {
      question: 'How do I track my order?',
      answer: 'You can track your order by logging into your account and visiting the Orders section.',
      category: 'ORDERS',
      order: 1,
      tags: ['orders', 'tracking'],
      isActive: true,
    },
    {
      question: 'What is your return policy?',
      answer: 'We offer a 7-day return policy on most items. Products must be unused and in original packaging.',
      category: 'RETURNS',
      order: 2,
      tags: ['returns', 'refund'],
      isActive: true,
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept Credit/Debit Cards, UPI, Net Banking, Wallets, and Cash on Delivery.',
      category: 'PAYMENT',
      order: 3,
      tags: ['payment'],
      isActive: true,
    },
  ];

  for (const faq of faqs) {
    await prisma.fAQ.create({ data: faq });
  }

  console.log(`  ✓ Created ${faqs.length} FAQs`);
}

// ============================================================================
// SEED TAX RULES
// ============================================================================

async function seedTaxRules() {
  console.log('💰 Seeding tax rules...');

  const taxRules = [
    {
      name: 'GST - Standard',
      description: 'Standard GST rate',
      rate: 18,
      type: 'GST',
      country: 'India',
      isActive: true,
    },
    {
      name: 'GST - Reduced',
      description: 'Reduced GST rate for essential items',
      rate: 5,
      type: 'GST',
      country: 'India',
      category: 'GROCERIES',
      isActive: true,
    },
  ];

  for (const rule of taxRules) {
    await prisma.taxRule.create({ data: rule });
  }

  console.log(`  ✓ Created ${taxRules.length} tax rules`);
}

// ============================================================================
// SEED SHIPPING ZONES
// ============================================================================

async function seedShippingZones() {
  console.log('🚚 Seeding shipping zones...');

  const zone = await prisma.shippingZone.create({
    data: {
      name: 'India - All States',
      description: 'Shipping across India',
      countries: ['India'],
      states: ['Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu', 'Gujarat'],
      isActive: true,
    },
  });

  await prisma.shippingMethod.create({
    data: {
      zoneId: zone.id,
      name: 'Standard Delivery',
      description: '5-7 business days',
      carrier: 'Delhivery',
      estimatedDays: 6,
      minDays: 5,
      maxDays: 7,
      cost: 50,
      freeThreshold: 500,
      isActive: true,
    },
  });

  await prisma.shippingMethod.create({
    data: {
      zoneId: zone.id,
      name: 'Express Delivery',
      description: '2-3 business days',
      carrier: 'Blue Dart',
      estimatedDays: 2,
      minDays: 2,
      maxDays: 3,
      cost: 150,
      isActive: true,
    },
  });

  console.log('  ✓ Created shipping zones and methods');
}

// ============================================================================
// SEED USERS
// ============================================================================

async function seedUsers() {
  console.log('👤 Seeding users...');

  const password = await hashPassword('password123');

  // Admin User
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin BharatCart',
      email: 'admin@bharatcart.com',
      password,
      phone: '+919876543210',
      isAdmin: true,
      emailVerified: true,
      phoneVerified: true,
      avatar: '/images/ui/avatar-placeholder/id/AV1.png',
    },
  });

  const admin = await prisma.admin.create({
    data: {
      userId: adminUser.id,
      storeName: 'BharatCart Official',
      storeUrl: 'bharatcart-official',
      storeDescription: 'Official BharatCart Store',
      storeLogo: '/images/BharatCart Logo.png',
      isVerified: true,
      commission: 0,
      rating: 5.0,
    },
  });

  // Seller Users
  const sellers = [
    {
      name: 'TechHub Electronics',
      email: 'techhub@example.com',
      phone: '+919876543211',
      storeName: 'TechHub',
      storeUrl: 'techhub-electronics',
    },
    {
      name: 'Fashion Fusion',
      email: 'fashion@example.com',
      phone: '+919876543212',
      storeName: 'Fashion Fusion',
      storeUrl: 'fashion-fusion',
    },
  ];

  for (const seller of sellers) {
    const user = await prisma.user.create({
      data: {
        name: seller.name,
        email: seller.email,
        password,
        phone: seller.phone,
        emailVerified: true,
        avatar: '/images/ui/avatar-placeholder/id/AV2.png',
      },
    });

    await prisma.admin.create({
      data: {
        userId: user.id,
        storeName: seller.storeName,
        storeUrl: seller.storeUrl,
        storeDescription: `Quality products from ${seller.storeName}`,
        isVerified: true,
        commission: 10,
        rating: 4.5,
      },
    });

    await prisma.seller.create({
      data: {
        userId: user.id,
        businessName: seller.storeName,
        businessType: 'RETAILER',
        gstNumber: `GST${getRandomInt(100000, 999999)}`,
        businessAddress: {
          street: '123 Business Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001',
        },
        isVerified: true,
      },
    });
  }

  // Regular Users
  const regularUsers = [
    {
      name: 'Rahul Kumar',
      email: 'rahul@example.com',
      phone: '+919876543220',
      avatar: '/images/ui/avatar-placeholder/boy/AV1.png',
    },
    {
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '+919876543221',
      avatar: '/images/ui/avatar-placeholder/girl/AV51.png',
    },
    {
      name: 'Amit Patel',
      email: 'amit@example.com',
      phone: '+919876543222',
      avatar: '/images/ui/avatar-placeholder/boy/AV2.png',
    },
  ];

  for (const userData of regularUsers) {
    const user = await prisma.user.create({
      data: {
        ...userData,
        password,
        emailVerified: true,
      },
    });

    // Create gamification progress
    await prisma.gamificationProgress.create({
      data: {
        userId: user.id,
        level: getRandomInt(1, 5),
        experience: getRandomInt(0, 500),
        nextLevelXp: 500,
        streak: getRandomInt(0, 10),
      },
    });

    // Create loyalty points
    await prisma.loyaltyPoints.create({
      data: {
        userId: user.id,
        totalEarned: getRandomInt(0, 5000),
        currentBalance: getRandomInt(0, 2000),
        tier: getRandomElement(['BRONZE', 'SILVER', 'GOLD']),
      },
    });
  }

  console.log(`  ✓ Created ${1 + sellers.length + regularUsers.length} users`);
}

// ============================================================================
// SEED CATEGORIES
// ============================================================================

async function seedCategories() {
  console.log('📦 Seeding categories...');

  const categories = [
    {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Latest gadgets and electronic devices',
      image: '/images/categories/electronics.png',
      icon: '📱',
      isFeatured: true,
      subcategories: [
        { name: 'Mobile Phones', slug: 'mobile-phones', image: '/images/categories/electronics.png' },
        { name: 'Laptops', slug: 'laptops', image: '/images/categories/electronics.png' },
        { name: 'Televisions', slug: 'televisions', image: '/images/categories/electronics.png' },
        { name: 'Gaming', slug: 'gaming', image: '/images/categories/electronics.png' },
        { name: 'Accessories', slug: 'electronics-accessories', image: '/images/categories/electronics.png' },
      ],
    },
    {
      name: 'Fashion',
      slug: 'fashion',
      description: 'Trendy clothing and accessories',
      image: '/images/categories/clothing.png',
      icon: '👕',
      isFeatured: true,
      subcategories: [
        { name: "Men's Clothing", slug: 'mens-clothing', image: '/images/categories/clothing.png' },
        { name: "Women's Clothing", slug: 'womens-clothing', image: '/images/categories/clothing.png' },
        { name: 'Kids Clothing', slug: 'kids-clothing', image: '/images/categories/clothing.png' },
        { name: 'Footwear', slug: 'footwear', image: '/images/categories/clothing.png' },
      ],
    },
    {
      name: 'Home & Kitchen',
      slug: 'home-kitchen',
      description: 'Home appliances and kitchenware',
      image: '/images/categories/home-appliance.png',
      icon: '🏠',
      isFeatured: true,
      subcategories: [
        { name: 'Kitchen Appliances', slug: 'kitchen-appliances', image: '/images/categories/kitchen.png' },
        { name: 'Home Decor', slug: 'home-decor', image: '/images/categories/home-appliance.png' },
      ],
    },
    {
      name: 'Beauty & Personal Care',
      slug: 'beauty',
      description: 'Beauty and personal care products',
      image: '/images/categories/beauty.png',
      icon: '💄',
      isFeatured: true,
      subcategories: [
        { name: 'Skincare', slug: 'skincare', image: '/images/categories/beauty.png' },
        { name: 'Makeup', slug: 'makeup', image: '/images/categories/beauty.png' },
        { name: 'Haircare', slug: 'haircare', image: '/images/categories/beauty.png' },
      ],
    },
    {
      name: 'Groceries',
      slug: 'groceries',
      description: 'Fresh groceries and daily essentials',
      image: '/images/categories/groceries.png',
      icon: '🛒',
      subcategories: [
        { name: 'Fruits & Vegetables', slug: 'fruits-vegetables', image: '/images/categories/groceries.png' },
        { name: 'Dairy', slug: 'dairy', image: '/images/categories/groceries.png' },
        { name: 'Snacks', slug: 'snacks', image: '/images/categories/groceries.png' },
      ],
    },
  ];

  let count = 0;

  for (const category of categories) {
    const { subcategories, ...categoryData } = category;

    const parent = await prisma.category.create({
      data: {
        ...categoryData,
        productCount: 0,
        level: 0,
      },
    });
    count++;

    if (subcategories) {
      for (const sub of subcategories) {
        await prisma.category.create({
          data: {
            ...sub,
            description: `${sub.name} products`,
            parentId: parent.id,
            level: 1,
            isActive: true,
            productCount: 0,
          },
        });
        count++;
      }
    }
  }

  console.log(`  ✓ Created ${count} categories`);
}

// ============================================================================
// SEED BRANDS
// ============================================================================

async function seedBrands() {
  console.log('🏷️  Seeding brands...');

  const brands = [
    { name: 'Apple', slug: 'apple', description: 'Think Different', logo: '/images/brands/apple.png', isFeatured: true },
    { name: 'Samsung', slug: 'samsung', description: 'Inspire the World', logo: '/images/brands/samsung.png', isFeatured: true },
    { name: 'Sony', slug: 'sony', description: 'Be Moved', logo: '/images/brands/sony.png', isFeatured: true },
    { name: 'Nike', slug: 'nike', description: 'Just Do It', logo: '/images/brands/nike.jpg', isFeatured: true },
    { name: 'Zara', slug: 'zara', description: 'Love Your Curves', logo: '/images/brands/zara.jpg', isFeatured: true },
    { name: 'LG', slug: 'lg', logo: '/images/brands/lg.png' },
    { name: 'HP', slug: 'hp', logo: '/images/brands/hp.png' },
    { name: 'Dell', slug: 'dell', logo: '/images/brands/dell.png' },
  ];

  for (const brand of brands) {
    await prisma.brand.create({ data: brand });
  }

  console.log(`  ✓ Created ${brands.length} brands`);
}

// ============================================================================
// SEED TAGS
// ============================================================================

async function seedTags() {
  console.log('🏷️  Seeding tags...');

  const tags = ['new-arrival', 'bestseller', 'trending', 'sale', 'exclusive', 'premium', 'eco-friendly', 'wireless', 'smart'];

  for (const tagName of tags) {
    await prisma.tag.create({
      data: {
        name: tagName.toUpperCase(),
        slug: tagName,
        type: 'PRODUCT',
      },
    });
  }

  console.log(`  ✓ Created ${tags.length} tags`);
}

// ============================================================================
// SEED ATTRIBUTE GROUPS
// ============================================================================

async function seedAttributeGroups() {
  console.log('🎨 Seeding attribute groups...');

  const groups = [
    {
      name: 'Color',
      slug: 'color',
      type: 'SELECT',
      isFilterable: true,
      attributes: [
        { name: 'Red', slug: 'red', value: 'Red', colorCode: '#FF0000' },
        { name: 'Blue', slug: 'blue', value: 'Blue', colorCode: '#0000FF' },
        { name: 'Black', slug: 'black', value: 'Black', colorCode: '#000000' },
      ],
    },
    {
      name: 'Size',
      slug: 'size',
      type: 'SELECT',
      isFilterable: true,
      attributes: [
        { name: 'S', slug: 's', value: 'S' },
        { name: 'M', slug: 'm', value: 'M' },
        { name: 'L', slug: 'l', value: 'L' },
        { name: 'XL', slug: 'xl', value: 'XL' },
      ],
    },
  ];

  for (const group of groups) {
    const { attributes, ...groupData } = group;
    
    const createdGroup = await prisma.attributeGroup.create({ data: groupData });

    for (const attr of attributes) {
      await prisma.attribute.create({
        data: { ...attr, groupId: createdGroup.id },
      });
    }
  }

  console.log(`  ✓ Created ${groups.length} attribute groups`);
}

// ============================================================================
// SEED PRODUCTS
// ============================================================================

async function seedProducts() {
  console.log('🛍️  Seeding products...');

  const admin = await prisma.admin.findFirst();
  const categories = await prisma.category.findMany({ where: { level: 1 } });

  if (!admin) {
    console.log('  ⚠ No admin found, skipping products');
    return;
  }

  const products = [
    {
      title: 'iPhone 15 Pro Max',
      slug: 'iphone-15-pro-max',
      description: 'Latest iPhone with A17 Pro chip, titanium design, and 48MP camera. Features include Dynamic Island, Always-On display, and exceptional battery life.',
      shortDescription: 'Premium flagship smartphone',
      price: 134900,
      comparePrice: 149900,
      categoryId: categories.find((c) => c.slug === 'mobile-phones')?.id || categories[0].id,
      adminId: admin.id,
      images: ['/images/products/electronics/mobiles/img1.jpg', '/images/products/electronics/mobiles/img2.webp'],
      thumbnail: '/images/products/electronics/mobiles/img1.jpg',
      sku: 'IPH15PM-256-TIT',
      stock: 50,
      brand: 'Apple',
      tags: ['smartphone', 'flagship', '5g', 'new-arrival'],
      isFeatured: true,
      isTrending: true,
      isPublished: true,
      publishedAt: new Date(),
      rating: 4.8,
      reviewCount: 245,
    },
    {
      title: 'Samsung Galaxy S24 Ultra',
      slug: 'samsung-galaxy-s24-ultra',
      description: 'Flagship Samsung phone with S Pen, 200MP camera, and Galaxy AI features.',
      shortDescription: 'Ultimate Android flagship',
      price: 129999,
      comparePrice: 144999,
      categoryId: categories.find((c) => c.slug === 'mobile-phones')?.id || categories[0].id,
      adminId: admin.id,
      images: ['/images/products/electronics/mobiles/img3.webp', '/images/products/electronics/mobiles/img4.webp'],
      thumbnail: '/images/products/electronics/mobiles/img3.webp',
      sku: 'SGS24U-512-BLK',
      stock: 35,
      brand: 'Samsung',
      tags: ['smartphone', 'android', 'bestseller'],
      isFeatured: true,
      isBestSeller: true,
      isPublished: true,
      publishedAt: new Date(),
      rating: 4.7,
      reviewCount: 189,
    },
    {
      title: 'Dell XPS 15 Laptop',
      slug: 'dell-xps-15-laptop',
      description: '15.6" InfinityEdge display, Intel Core i7, 16GB RAM, 512GB SSD. Perfect for professionals and creators.',
      shortDescription: 'Premium ultrabook',
      price: 159999,
      comparePrice: 179999,
      categoryId: categories.find((c) => c.slug === 'laptops')?.id || categories[0].id,
      adminId: admin.id,
      images: ['/images/products/electronics/laptops/img1.webp', '/images/products/electronics/laptops/img2.webp'],
      thumbnail: '/images/products/electronics/laptops/img1.webp',
      sku: 'DELL-XPS15-I7',
      stock: 20,
      brand: 'Dell',
      tags: ['laptop', 'ultrabook', 'premium'],
      isFeatured: true,
      isPublished: true,
      publishedAt: new Date(),
      rating: 4.6,
      reviewCount: 156,
    },
    {
      title: "Levi's 501 Original Jeans",
      slug: 'levis-501-original-jeans',
      description: 'Classic straight-fit jeans with button fly. Timeless design that never goes out of style.',
      shortDescription: 'Iconic denim jeans',
      price: 3999,
      comparePrice: 4999,
      categoryId: categories.find((c) => c.slug === 'mens-clothing')?.id || categories[0].id,
      adminId: admin.id,
      images: ['/images/products/clothing/men/jeans/img1.webp', '/images/products/clothing/men/jeans/img2.webp'],
      thumbnail: '/images/products/clothing/men/jeans/img1.webp',
      sku: 'LEVIS-501-32',
      stock: 100,
      brand: "Levi's",
      tags: ['jeans', 'denim', 'casual'],
      size: ['28', '30', '32', '34', '36'],
      color: ['Blue', 'Black'],
      isPublished: true,
      publishedAt: new Date(),
      rating: 4.5,
      reviewCount: 432,
    },
    {
      title: 'Zara Floral Print Dress',
      slug: 'zara-floral-print-dress',
      description: 'Elegant floral print midi dress. Perfect for summer occasions and casual outings.',
      shortDescription: 'Trendy summer dress',
      price: 2999,
      comparePrice: 3999,
      categoryId: categories.find((c) => c.slug === 'womens-clothing')?.id || categories[0].id,
      adminId: admin.id,
      images: ['/images/products/clothing/women/dresses/img1.webp', '/images/products/clothing/women/dresses/img2.webp'],
      thumbnail: '/images/products/clothing/women/dresses/img1.webp',
      sku: 'ZARA-FPD-M',
      stock: 75,
      brand: 'Zara',
      tags: ['dress', 'floral', 'trending'],
      size: ['XS', 'S', 'M', 'L', 'XL'],
      isTrending: true,
      isPublished: true,
      publishedAt: new Date(),
      rating: 4.4,
      reviewCount: 198,
    },
    {
      title: 'Lakme Absolute Matte Lipstick',
      slug: 'lakme-absolute-matte-lipstick',
      description: 'Long-lasting matte finish lipstick with rich color payoff.',
      shortDescription: 'Premium matte lipstick',
      price: 599,
      comparePrice: 750,
      categoryId: categories.find((c) => c.slug === 'makeup')?.id || categories[0].id,
      adminId: admin.id,
      images: ['/images/products/beauty/makeup/img1.jpg', '/images/products/beauty/makeup/img2.jpg'],
      thumbnail: '/images/products/beauty/makeup/img1.jpg',
      sku: 'LAKME-ABS-RED',
      stock: 200,
      brand: 'Lakme',
      tags: ['lipstick', 'makeup', 'bestseller'],
      isBestSeller: true,
      isPublished: true,
      publishedAt: new Date(),
      rating: 4.3,
      reviewCount: 567,
    },
    {
      title: 'Organic Fresh Apples - 1kg',
      slug: 'organic-fresh-apples',
      description: 'Fresh organic apples from Himachal Pradesh. Rich in vitamins and fiber.',
      shortDescription: 'Premium quality apples',
      price: 199,
      comparePrice: 249,
      categoryId: categories.find((c) => c.slug === 'fruits-vegetables')?.id || categories[0].id,
      adminId: admin.id,
      images: ['/images/products/groceries/fruits/img1.webp'],
      thumbnail: '/images/products/groceries/fruits/img1.webp',
      sku: 'FRUIT-APPLE-1KG',
      stock: 500,
      brand: 'BharatCart Fresh',
      tags: ['fruits', 'organic', 'fresh'],
      isNew: true,
      isPublished: true,
      publishedAt: new Date(),
      rating: 4.6,
      reviewCount: 89,
    },
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });
  }

  console.log(`  ✓ Created ${products.length} products`);
}

// ============================================================================
// SEED PRODUCT VARIANTS
// ============================================================================

async function seedProductVariants() {
  console.log('🎨 Seeding product variants...');

  const iphone = await prisma.product.findFirst({
    where: { slug: 'iphone-15-pro-max' },
  });

  if (iphone) {
    const variants = [
      {
        productId: iphone.id,
        name: '256GB Titanium',
        sku: 'IPH15PM-256-TIT',
        price: 134900,
        stock: 30,
        attributes: { storage: '256GB', color: 'Titanium' },
        isDefault: true,
      },
      {
        productId: iphone.id,
        name: '512GB Titanium',
        sku: 'IPH15PM-512-TIT',
        price: 154900,
        stock: 20,
        attributes: { storage: '512GB', color: 'Titanium' },
      },
    ];

    for (const variant of variants) {
      await prisma.productVariant.create({ data: variant });
    }

    console.log(`  ✓ Created ${variants.length} product variants`);
  }
}

// ============================================================================
// SEED COUPONS
// ============================================================================

async function seedCoupons() {
  console.log('🎟️  Seeding coupons...');

  const admin = await prisma.admin.findFirst();

  const coupons = [
    {
      code: 'WELCOME10',
      name: 'Welcome Offer',
      description: '10% off on your first order',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minPurchase: 500,
      maxDiscount: 500,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      firstOrderOnly: true,
      adminId: admin?.id,
    },
    {
      code: 'SAVE500',
      name: 'Flat 500 Off',
      description: 'Flat ₹500 off on orders above ₹2000',
      discountType: 'FIXED',
      discountValue: 500,
      minPurchase: 2000,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      isActive: true,
      adminId: admin?.id,
    },
  ];

  for (const coupon of coupons) {
    await prisma.coupon.create({ data: coupon });
  }

  console.log(`  ✓ Created ${coupons.length} coupons`);
}

// ============================================================================
// SEED BANNERS
// ============================================================================

async function seedBanners() {
  console.log('🎨 Seeding banners...');

  const banners = [
    {
      title: 'Summer Sale',
      description: 'Up to 50% off on fashion',
      image: '/images/banners/fashion-banner.png',
      link: '/deals',
      position: 'HOME_HERO',
      isActive: true,
      order: 1,
    },
    {
      title: 'New Electronics',
      description: 'Latest gadgets at best prices',
      image: '/images/banners/electronics-banner.png',
      link: '/categories/electronics',
      position: 'HOME_HERO',
      isActive: true,
      order: 2,
    },
  ];

  for (const banner of banners) {
    await prisma.banner.create({ data: banner });
  }

  console.log(`  ✓ Created ${banners.length} banners`);
}

// ============================================================================
// SEED FLASH SALES
// ============================================================================

async function seedFlashSales() {
  console.log('⚡ Seeding flash sales...');

  const products = await prisma.product.findMany({ take: 3 });

  const flashSale = await prisma.flashSale.create({
    data: {
      name: 'Weekend Flash Sale',
      slug: 'weekend-flash-sale',
      description: 'Huge discounts on selected products',
      startTime: new Date(),
      endTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
      discount: 30,
      isActive: true,
    },
  });

  for (const product of products) {
    await prisma.flashSaleProduct.create({
      data: {
        flashSaleId: flashSale.id,
        productId: product.id,
        discountType: 'PERCENTAGE',
        discount: 30,
        salePrice: product.price * 0.7,
        originalPrice: product.price,
        stock: 50,
      },
    });
  }

  console.log('  ✓ Created flash sale');
}

// ============================================================================
// SEED BADGES
// ============================================================================

async function seedBadges() {
  console.log('🏅 Seeding badges...');

  const badges = [
    {
      name: 'First Purchase',
      slug: 'first-purchase',
      description: 'Complete your first purchase',
      image: '/badges/first-purchase.png',
      category: 'PURCHASE',
      rarity: 'COMMON',
      points: 10,
      requirement: { type: 'ORDER_COUNT', value: 1 },
    },
    {
      name: 'Loyal Customer',
      slug: 'loyal-customer',
      description: 'Make 10 purchases',
      image: '/badges/loyal-customer.png',
      category: 'PURCHASE',
      rarity: 'RARE',
      points: 50,
      requirement: { type: 'ORDER_COUNT', value: 10 },
    },
  ];

  for (const badge of badges) {
    await prisma.badge.create({ data: badge });
  }

  console.log(`  ✓ Created ${badges.length} badges`);
}

// ============================================================================
// SEED ACHIEVEMENTS
// ============================================================================

async function seedAchievements() {
  console.log('🏆 Seeding achievements...');

  const achievements = [
    {
      name: 'Shopping Spree',
      slug: 'shopping-spree',
      description: 'Spend ₹10,000 in a month',
      category: 'SPENDING',
      tier: 'BRONZE',
      points: 50,
      xpReward: 100,
      requirement: { type: 'MONTHLY_SPEND', value: 10000 },
    },
    {
      name: 'Big Spender',
      slug: 'big-spender',
      description: 'Spend ₹50,000 in total',
      category: 'SPENDING',
      tier: 'SILVER',
      points: 100,
      xpReward: 250,
      requirement: { type: 'TOTAL_SPEND', value: 50000 },
    },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.create({ data: achievement });
  }

  console.log(`  ✓ Created ${achievements.length} achievements`);
}

// ============================================================================
// SEED CHALLENGES
// ============================================================================

async function seedChallenges() {
  console.log('🎯 Seeding challenges...');

  const challenges = [
    {
      name: 'Daily Deal Hunter',
      slug: 'daily-deal-hunter',
      description: 'Purchase any product today',
      type: 'DAILY',
      difficulty: 'EASY',
      requirement: { type: 'PURCHASE', value: 1 },
      reward: { points: 10, xp: 20 },
      startDate: new Date(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  ];

  for (const challenge of challenges) {
    await prisma.challenge.create({ data: challenge });
  }

  console.log(`  ✓ Created ${challenges.length} challenges`);
}

// ============================================================================
// SEED QUESTS
// ============================================================================

async function seedQuests() {
  console.log('🗺️  Seeding quests...');

  const quests = [
    {
      name: 'Welcome Quest',
      slug: 'welcome-quest',
      description: 'Complete your profile and make your first purchase',
      category: 'ONBOARDING',
      difficulty: 'EASY',
      steps: [
        { order: 1, title: 'Complete Profile', description: 'Add your details' },
        { order: 2, title: 'First Purchase', description: 'Buy any product' },
      ],
      rewards: { points: 100, xp: 200, badge: 'first-purchase' },
    },
  ];

  for (const quest of quests) {
    await prisma.quest.create({ data: quest });
  }

  console.log(`  ✓ Created ${quests.length} quests`);
}

// ============================================================================
// SEED LEADERBOARDS
// ============================================================================

async function seedLeaderboards() {
  console.log('🏆 Seeding leaderboards...');

  await prisma.leaderboard.create({
    data: {
      name: 'Top Shoppers',
      slug: 'top-shoppers',
      type: 'POINTS',
      period: 'MONTHLY',
      isActive: true,
    },
  });

  console.log('  ✓ Created leaderboard');
}

// ============================================================================
// SEED SPIN WHEELS
// ============================================================================

async function seedSpinWheels() {
  console.log('🎡 Seeding spin wheels...');

  await prisma.spinWheel.create({
    data: {
      name: 'Daily Spin',
      description: 'Spin daily for rewards',
      prizes: [
        { name: '10% Off', probability: 0.3 },
        { name: '50 Points', probability: 0.4 },
        { name: 'Free Shipping', probability: 0.2 },
        { name: '₹100 Off', probability: 0.1 },
      ],
      spinCost: 0,
      maxSpinsPerDay: 1,
      isActive: true,
    },
  });

  console.log('  ✓ Created spin wheel');
}

// ============================================================================
// SEED BLOG POSTS
// ============================================================================

async function seedBlogPosts() {
  console.log('📝 Seeding blog posts...');

  const user = await prisma.user.findFirst();

  if (user) {
    await prisma.blogPost.create({
      data: {
        title: 'Top 10 Smartphones of 2024',
        slug: 'top-10-smartphones-2024',
        content: 'Discover the best smartphones available in 2024...',
        excerpt: 'Our curated list of the best smartphones',
        authorId: user.id,
        tags: ['smartphones', 'technology', 'reviews'],
        featuredImage: '/images/blog/smartphones-2024.jpg',
        status: 'DRAFT',
        isFeatured: true,
      },
    });

    console.log('  ✓ Created blog post');
  }
}

// ============================================================================
// SEED CONTENT PAGES
// ============================================================================

async function seedContentPages() {
  console.log('📄 Seeding content pages...');

  const pages = [
    {
      title: 'About Us',
      slug: 'about-us',
      content: 'BharatCart is India\'s premier e-commerce marketplace...',
      excerpt: 'Learn about BharatCart',
      author: 'Admin',
      status: 'DRAFT',
    },
    {
      title: 'Privacy Policy',
      slug: 'privacy-policy',
      content: 'Your privacy is important to us...',
      excerpt: 'Our privacy policy',
      author: 'Admin',
      status: 'DRAFT',
    },
  ];

  for (const page of pages) {
    await prisma.contentPage.create({ data: page });
  }

  console.log(`  ✓ Created ${pages.length} content pages`);
}

// ============================================================================
// SEED VIDEO CONTENT
// ============================================================================

async function seedVideoContent() {
  console.log('🎥 Seeding video content...');

  await prisma.videoContent.create({
    data: {
      title: 'iPhone 15 Pro Max Review',
      description: 'Detailed review of the iPhone 15 Pro Max',
      videoUrl: 'https://example.com/video.mp4',
      thumbnail: '/images/video-thumbnails/iphone-review.jpg',
      duration: 600,
      tags: ['review', 'iphone', 'tech'],
      isShoppable: true,
    },
  });

  console.log('  ✓ Created video content');
}

// ============================================================================
// SEED NEWSLETTERS
// ============================================================================

async function seedNewsletters() {
  console.log('📧 Seeding newsletters...');

  await prisma.newsletter.create({
    data: {
      email: 'subscriber@example.com',
      name: 'John Doe',
      isSubscribed: true,
      source: 'WEBSITE',
    },
  });

  console.log('  ✓ Created newsletter subscriber');
}

// ============================================================================
// SEED WAREHOUSES
// ============================================================================

async function seedWarehouses() {
  console.log('🏭 Seeding warehouses...');

  await prisma.warehouse.create({
    data: {
      name: 'Mumbai Central Warehouse',
      code: 'MH-01',
      type: 'FULFILLMENT',
      address: {
        street: '123 Warehouse Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
      },
      isActive: true,
      isPrimary: true,
    },
  });

  console.log('  ✓ Created warehouse');
}

// ============================================================================
// SEED ML MODELS
// ============================================================================

async function seedMLModels() {
  console.log('🤖 Seeding ML models...');

  await prisma.mLModel.create({
    data: {
      name: 'Product Recommendation',
      version: '1.0',
      type: 'RECOMMENDATION',
      algorithm: 'COLLABORATIVE_FILTERING',
      status: 'TRAINING',
      parameters: { neighbors: 10, iterations: 100 },
    },
  });

  console.log('  ✓ Created ML model');
}

// ============================================================================
// SEED AI MODELS
// ============================================================================

async function seedAIModels() {
  console.log('🧠 Seeding AI models...');

  await prisma.aIModel.create({
    data: {
      name: 'Chatbot',
      type: 'NLP',
      version: '1.0',
      provider: 'OPENAI',
      config: { model: 'gpt-4', temperature: 0.7 },
      isActive: true,
    },
  });

  console.log('  ✓ Created AI model');
}

// ============================================================================
// SEED DAO PROPOSALS
// ============================================================================

async function seedDAOProposals() {
  console.log('🗳️  Seeding DAO proposals...');

  await prisma.dAOProposal.create({
    data: {
      title: 'Add New Product Category',
      description: 'Proposal to add Sports & Fitness category',
      proposer: '0x1234567890abcdef',
      type: 'FEATURE',
      quorum: 100,
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('  ✓ Created DAO proposal');
}

// ============================================================================
// SEED INSTALLMENT PLANS
// ============================================================================

async function seedInstallmentPlans() {
  console.log('💳 Seeding installment plans...');

  const plans = [
    {
      name: '3 Month EMI',
      description: 'Pay in 3 easy installments',
      provider: 'BAJAJ_FINSERV',
      minAmount: 5000,
      tenure: 3,
      interestRate: 0,
      isActive: true,
    },
    {
      name: '6 Month EMI',
      description: 'Pay in 6 easy installments',
      provider: 'HDFC',
      minAmount: 10000,
      tenure: 6,
      interestRate: 12,
      processingFee: 199,
      isActive: true,
    },
  ];

  for (const plan of plans) {
    await prisma.installmentPlan.create({ data: plan });
  }

  console.log(`  ✓ Created ${plans.length} installment plans`);
}

// ============================================================================
// SEED AUCTIONS
// ============================================================================

async function seedAuctions() {
  console.log('🔨 Seeding auctions...');

  const product = await prisma.product.findFirst();

  if (product) {
    await prisma.auction.create({
      data: {
        productId: product.id,
        title: 'Rare Limited Edition Item',
        description: 'Don\'t miss this opportunity',
        startingPrice: 10000,
        buyNowPrice: 50000,
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    console.log('  ✓ Created auction');
  }
}

// ============================================================================
// SEED MYSTERY BOXES
// ============================================================================

async function seedMysteryBoxes() {
  console.log('🎁 Seeding mystery boxes...');

  await prisma.mysteryBox.create({
    data: {
      name: 'Electronics Mystery Box',
      slug: 'electronics-mystery-box',
      description: 'Surprise electronics worth ₹5000+',
      price: 2999,
      value: 5000,
      category: 'ELECTRONICS',
      rarity: 'RARE',
      stock: 100,
    },
  });

  console.log('  ✓ Created mystery box');
}

// ============================================================================
// SEED SUBSCRIPTION PLANS
// ============================================================================

async function seedSubscriptionPlans() {
  console.log('📅 Seeding subscription plans...');

  const plans = [
    {
      name: 'BharatCart Plus',
      slug: 'bharatcart-plus',
      description: 'Premium membership with exclusive benefits',
      price: 999,
      interval: 'MONTHLY',
      features: [
        { name: 'Free Shipping', value: true },
        { name: 'Early Access to Sales', value: true },
        { name: 'Exclusive Discounts', value: '10%' },
      ],
      isActive: true,
    },
    {
      name: 'BharatCart Premium',
      slug: 'bharatcart-premium',
      description: 'Ultimate shopping experience',
      price: 9999,
      interval: 'YEARLY',
      features: [
        { name: 'Free Shipping', value: true },
        { name: 'Priority Support', value: true },
        { name: 'Exclusive Discounts', value: '15%' },
      ],
      isActive: true,
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.create({ data: plan });
  }

  console.log(`  ✓ Created ${plans.length} subscription plans`);
}

// ============================================================================
// SEED INFLUENCER PROFILES
// ============================================================================

async function seedInfluencerProfiles() {
  console.log('📸 Seeding influencer profiles...');

  const user = await prisma.user.findFirst({ where: { email: 'priya@example.com' } });

  if (user) {
    await prisma.influencerProfile.create({
      data: {
        userId: user.id,
        username: 'priya_fashion',
        bio: 'Fashion influencer and style blogger',
        platforms: { instagram: '@priya_fashion', youtube: 'PriyaFashion' },
        followers: 50000,
        engagement: 4.5,
        niche: ['fashion', 'lifestyle'],
        commission: 5,
        isVerified: true,
      },
    });

    console.log('  ✓ Created influencer profile');
  }
}

// ============================================================================
// SEED AFFILIATE PROFILES
// ============================================================================

async function seedAffiliateProfiles() {
  console.log('💼 Seeding affiliate profiles...');

  const user = await prisma.user.findFirst({ where: { email: 'amit@example.com' } });

  if (user) {
    await prisma.affiliateProfile.create({
      data: {
        userId: user.id,
        businessName: 'Tech Reviews Blog',
        website: 'https://techreviews.example.com',
        commission: 5,
        isVerified: true,
      },
    });

    console.log('  ✓ Created affiliate profile');
  }
}

// ============================================================================
// SEED RENTAL PRODUCTS
// ============================================================================

async function seedRentalProducts() {
  console.log('🔄 Seeding rental products...');

  const product = await prisma.product.findFirst({
    where: { brand: 'Apple' },
  });

  if (product) {
    await prisma.rentalProduct.create({
      data: {
        productId: product.id,
        dailyRate: 500,
        weeklyRate: 3000,
        monthlyRate: 10000,
        securityDeposit: 5000,
        minRentalDays: 1,
        availableUnits: 5,
      },
    });

    console.log('  ✓ Created rental product');
  }
}

// ============================================================================
// SEED PRODUCT INSURANCE
// ============================================================================

async function seedProductInsurance() {
  console.log('🛡️  Seeding product insurance...');

  const product = await prisma.product.findFirst({
    where: { brand: 'Apple' },
  });

  if (product) {
    await prisma.productInsurance.create({
      data: {
        productId: product.id,
        name: 'Premium Protection Plan',
        description: 'Complete protection against damage and theft',
        provider: 'BharatCart Insurance',
        coverage: { damage: true, theft: true, warranty: '2 years' },
        premium: 2999,
        duration: 24,
      },
    });

    console.log('  ✓ Created product insurance');
  }
}

// ============================================================================
// SEED TRADE-IN PROGRAMS
// ============================================================================

async function seedTradeInPrograms() {
  console.log('♻️  Seeding trade-in programs...');

  await prisma.tradeInProgram.create({
    data: {
      name: 'Smartphone Trade-In',
      description: 'Get instant value for your old smartphone',
      categoryIds: [],
      isActive: true,
    },
  });

  console.log('  ✓ Created trade-in program');
}

// ============================================================================
// SEED SHOPPING GROUPS
// ============================================================================

async function seedShoppingGroups() {
  console.log('👥 Seeding shopping groups...');

  const user = await prisma.user.findFirst();

  if (user) {
    await prisma.shoppingGroup.create({
      data: {
        name: 'Tech Enthusiasts',
        description: 'Group for tech lovers',
        creatorId: user.id,
        isPublic: true,
        code: 'TECH2024',
      },
    });

    console.log('  ✓ Created shopping group');
  }
}

// ============================================================================
// SEED REGISTRIES
// ============================================================================

async function seedRegistries() {
  console.log('💝 Seeding registries...');

  const user = await prisma.user.findFirst();

  if (user) {
    await prisma.registry.create({
      data: {
        userId: user.id,
        type: 'WEDDING',
        title: 'Rahul & Priya Wedding Registry',
        description: 'Help us celebrate our special day',
        eventDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        privacyLevel: 'PUBLIC',
        slug: 'rahul-priya-wedding',
      },
    });

    console.log('  ✓ Created registry');
  }
}

// ============================================================================
// SEED FEATURE FLAGS
// ============================================================================

async function seedFeatureFlags() {
  console.log('🚩 Seeding feature flags...');

  const flags = [
    {
      name: 'Enable Web3 Features',
      key: 'web3_enabled',
      description: 'Enable NFT and crypto payment features',
      isEnabled: false,
    },
    {
      name: 'Enable Live Shopping',
      key: 'live_shopping_enabled',
      description: 'Enable live streaming shopping feature',
      isEnabled: true,
    },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.create({ data: flag });
  }

  console.log(`  ✓ Created ${flags.length} feature flags`);
}

// ============================================================================
// EXECUTE MAIN
// ============================================================================

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });