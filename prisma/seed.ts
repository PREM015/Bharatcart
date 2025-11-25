import { PrismaClient, DiscountType, NotificationType, AddressType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================================================
  // CLEAR EXISTING DATA (DEVELOPMENT ONLY)
  // ============================================================================
  console.log('🧹 Cleaning existing data...');
  
  await prisma.activityLog.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.searchHistory.deleteMany();
  await prisma.viewHistory.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.review.deleteMany();
  await prisma.address.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Existing data cleaned\n');

  // ============================================================================
  // CREATE USERS
  // ============================================================================
  console.log('👤 Creating users...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@bharatcart.com',
      password: hashedPassword,
      phone: '+919876543210',
      isAdmin: true,
      emailVerified: true,
      phoneVerified: true,
      avatar: '/images/ui/avatar-placeholder/boy/AV1.png',
    },
  });

  const regularUser1 = await prisma.user.create({
    data: {
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      password: hashedPassword,
      phone: '+919876543211',
      emailVerified: true,
      avatar: '/images/ui/avatar-placeholder/boy/AV2.png',
    },
  });

  const regularUser2 = await prisma.user.create({
    data: {
      name: 'Priya Patel',
      email: 'priya@example.com',
      password: hashedPassword,
      phone: '+919876543212',
      emailVerified: true,
      avatar: '/images/ui/avatar-placeholder/girl/AV51.png',
    },
  });

  console.log('✅ Users created\n');

  // ============================================================================
  // CREATE ADMIN/STORE
  // ============================================================================
  console.log('🏪 Creating admin store...');

  const admin = await prisma.admin.create({
    data: {
      userId: adminUser.id,
      storeName: 'BharatCart Official Store',
      storeUrl: 'bharatcart-official',
      storeDescription: 'Official BharatCart store with curated products',
      storeLogo: '/images/BharatCart Logo.png',
      isVerified: true,
      commission: 5.0,
    },
  });

  console.log('✅ Admin store created\n');

  // ============================================================================
  // CREATE CATEGORIES
  // ============================================================================
  console.log('📂 Creating categories...');

  const electronics = await prisma.category.create({
    data: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Latest electronic devices and gadgets',
      image: '/images/categories/electronics.png',
      metaTitle: 'Electronics - BharatCart',
      metaDesc: 'Shop latest electronics and gadgets',
    },
  });

  const mobiles = await prisma.category.create({
    data: {
      name: 'Mobile Phones',
      slug: 'mobiles',
      description: 'Smartphones and accessories',
      image: '/images/categories/electronics.png',
      parentId: electronics.id,
    },
  });

  const laptops = await prisma.category.create({
    data: {
      name: 'Laptops',
      slug: 'laptops',
      description: 'Latest laptops and notebooks',
      image: '/images/categories/electronics.png',
      parentId: electronics.id,
    },
  });

  const fashion = await prisma.category.create({
    data: {
      name: 'Fashion',
      slug: 'fashion',
      description: 'Trendy clothing and accessories',
      image: '/images/categories/clothing.png',
      metaTitle: 'Fashion - BharatCart',
      metaDesc: 'Shop latest fashion trends',
    },
  });

  const mensFashion = await prisma.category.create({
    data: {
      name: "Men's Fashion",
      slug: 'mens-fashion',
      description: "Men's clothing and accessories",
      image: '/images/categories/clothing.png',
      parentId: fashion.id,
    },
  });

  const womensFashion = await prisma.category.create({
    data: {
      name: "Women's Fashion",
      slug: 'womens-fashion',
      description: "Women's clothing and accessories",
      image: '/images/categories/clothing.png',
      parentId: fashion.id,
    },
  });

  const homeKitchen = await prisma.category.create({
    data: {
      name: 'Home & Kitchen',
      slug: 'home-kitchen',
      description: 'Home appliances and kitchen essentials',
      image: '/images/categories/home-appliance.png',
      metaTitle: 'Home & Kitchen - BharatCart',
      metaDesc: 'Shop home appliances and kitchen products',
    },
  });

  const beauty = await prisma.category.create({
    data: {
      name: 'Beauty & Personal Care',
      slug: 'beauty',
      description: 'Beauty products and personal care items',
      image: '/images/categories/beauty.png',
      metaTitle: 'Beauty - BharatCart',
      metaDesc: 'Shop beauty and personal care products',
    },
  });

  const groceries = await prisma.category.create({
    data: {
      name: 'Groceries',
      slug: 'groceries',
      description: 'Fresh groceries and daily essentials',
      image: '/images/categories/groceries.png',
      metaTitle: 'Groceries - BharatCart',
      metaDesc: 'Shop fresh groceries online',
    },
  });

  console.log('✅ Categories created\n');

  // ============================================================================
  // CREATE PRODUCTS
  // ============================================================================
  console.log('📦 Creating products...');

  // Electronics Products
  const product1 = await prisma.product.create({
    data: {
      title: 'iPhone 15 Pro Max',
      slug: 'iphone-15-pro-max',
      description: 'Latest iPhone with A17 Pro chip, titanium design, and advanced camera system',
      shortDescription: 'Flagship iPhone with cutting-edge features',
      price: 134900,
      comparePrice: 159900,
      categoryId: mobiles.id,
      adminId: admin.id,
      images: [
        '/images/products/electronics/mobiles/img1.webp',
        '/images/products/electronics/mobiles/img2.webp',
        '/images/products/electronics/mobiles/img3.webp',
      ],
      thumbnail: '/images/products/electronics/mobiles/img1.webp',
      sku: 'IPH-15-PRO-MAX',
      stock: 50,
      brand: 'Apple',
      tags: ['smartphone', 'iphone', 'flagship'],
      discountPercentage: 15.6,
      isFeatured: true,
      isTrending: true,
      isBestSeller: true,
      isPublished: true,
      publishedAt: new Date(),
      rating: 4.8,
      reviewCount: 0,
      metaTitle: 'iPhone 15 Pro Max - BharatCart',
      metaDescription: 'Buy iPhone 15 Pro Max with best price',
      metaKeywords: ['iphone', 'apple', 'smartphone'],
    },
  });

  const product2 = await prisma.product.create({
    data: {
      title: 'MacBook Pro 16" M3 Max',
      slug: 'macbook-pro-16-m3-max',
      description: 'Powerful MacBook Pro with M3 Max chip, stunning Liquid Retina XDR display',
      shortDescription: 'Professional laptop for creators',
      price: 329900,
      comparePrice: 349900,
      categoryId: laptops.id,
      adminId: admin.id,
      images: [
        '/images/products/electronics/laptops/img1.webp',
        '/images/products/electronics/laptops/img2.webp',
      ],
      thumbnail: '/images/products/electronics/laptops/img1.webp',
      sku: 'MBP-16-M3',
      stock: 25,
      brand: 'Apple',
      tags: ['laptop', 'macbook', 'professional'],
      discountPercentage: 5.7,
      isFeatured: true,
      isNew: true,
      isPublished: true,
      publishedAt: new Date(),
      rating: 4.9,
    },
  });

  // Fashion Products
  const product3 = await prisma.product.create({
    data: {
      title: "Men's Cotton Casual Shirt",
      slug: 'mens-cotton-casual-shirt-blue',
      description: 'Premium quality cotton shirt for casual wear. Comfortable and stylish.',
      shortDescription: 'Comfortable cotton casual shirt',
      price: 899,
      comparePrice: 1499,
      categoryId: mensFashion.id,
      adminId: admin.id,
      images: [
        '/images/products/clothing/men/shirts/img1.webp',
        '/images/products/clothing/men/shirts/img2.webp',
      ],
      thumbnail: '/images/products/clothing/men/shirts/img1.webp',
      sku: 'MSH-COT-BLU-01',
      stock: 100,
      brand: 'Raymond',
      tags: ['shirt', 'casual', 'cotton', 'mens'],
      discountPercentage: 40,
      isFeatured: true,
      isPublished: true,
      publishedAt: new Date(),
      rating: 4.3,
    },
  });

  const product4 = await prisma.product.create({
    data: {
      title: "Women's Ethnic Kurti",
      slug: 'womens-ethnic-kurti-red',
      description: 'Beautiful ethnic kurti with intricate embroidery work',
      shortDescription: 'Elegant ethnic wear for women',
      price: 1299,
      comparePrice: 2499,
      categoryId: womensFashion.id,
      adminId: admin.id,
      images: [
        '/images/products/clothing/women/ethnic/img1.webp',
        '/images/products/clothing/women/ethnic/img2.webp',
      ],
      thumbnail: '/images/products/clothing/women/ethnic/img1.webp',
      sku: 'WKR-ETH-RED-01',
      stock: 75,
      brand: 'Fabindia',
      tags: ['kurti', 'ethnic', 'womens', 'traditional'],
      discountPercentage: 48,
      isTrending: true,
      isPublished: true,
      publishedAt: new Date(),
      rating: 4.5,
    },
  });

  // Home & Kitchen Products
  const product5 = await prisma.product.create({
    data: {
      title: 'Smart LED TV 55" 4K Ultra HD',
      slug: 'smart-led-tv-55-4k',
      description: 'Experience stunning visuals with 4K Ultra HD resolution and smart features',
      shortDescription: '55" Smart 4K LED TV',
      price: 39999,
      comparePrice: 59999,
      categoryId: homeKitchen.id,
      adminId: admin.id,
      images: [
        '/images/products/electronics/televisions/img1.webp',
        '/images/products/electronics/televisions/img2.webp',
      ],
      thumbnail: '/images/products/electronics/televisions/img1.webp',
      sku: 'TV-LED-55-4K',
      stock: 30,
      brand: 'Samsung',
      tags: ['tv', 'smart tv', '4k', 'led'],
      discountPercentage: 33.3,
      isFeatured: true,
      isBestSeller: true,
      isPublished: true,
      publishedAt: new Date(),
      rating: 4.6,
    },
  });

  // Beauty Products
  const product6 = await prisma.product.create({
    data: {
      title: 'Lakme Perfecting Liquid Foundation',
      slug: 'lakme-perfecting-liquid-foundation',
      description: 'Long-lasting liquid foundation for flawless skin',
      shortDescription: 'Flawless finish foundation',
      price: 599,
      comparePrice: 850,
      categoryId: beauty.id,
      adminId: admin.id,
      images: [
        '/images/products/beauty/makeup/img1.jpg',
        '/images/products/beauty/makeup/img2.jpg',
      ],
      thumbnail: '/images/products/beauty/makeup/img1.jpg',
      sku: 'LAK-FND-LIQ-01',
      stock: 200,
      brand: 'Lakme',
      tags: ['makeup', 'foundation', 'beauty'],
      discountPercentage: 29.5,
      isTrending: true,
      isPublished: true,
      publishedAt: new Date(),
      rating: 4.2,
    },
  });

  // Grocery Products
  const product7 = await prisma.product.create({
    data: {
      title: 'Organic Fresh Apples - 1kg',
      slug: 'organic-fresh-apples-1kg',
      description: 'Farm fresh organic apples, rich in nutrients',
      shortDescription: 'Fresh organic apples',
      price: 180,
      comparePrice: 220,
      categoryId: groceries.id,
      adminId: admin.id,
      images: [
        '/images/products/groceries/fruits/img1.webp',
        '/images/products/groceries/fruits/img2.webp',
      ],
      thumbnail: '/images/products/groceries/fruits/img1.webp',
      sku: 'GRC-FRT-APL-1KG',
      stock: 500,
      brand: 'Farm Fresh',
      tags: ['fruits', 'organic', 'healthy'],
      discountPercentage: 18.2,
      isNew: true,
      isPublished: true,
      publishedAt: new Date(),
      rating: 4.4,
    },
  });

  console.log('✅ Products created\n');

  // ============================================================================
  // CREATE PRODUCT VARIANTS
  // ============================================================================
  console.log('🎨 Creating product variants...');

  await prisma.productVariant.createMany({
    data: [
      {
        productId: product1.id,
        name: 'Natural Titanium - 256GB',
        sku: 'IPH-15-PRO-NAT-256',
        price: 134900,
        stock: 20,
        attributes: { color: 'Natural Titanium', storage: '256GB' },
      },
      {
        productId: product1.id,
        name: 'Blue Titanium - 256GB',
        sku: 'IPH-15-PRO-BLU-256',
        price: 134900,
        stock: 15,
        attributes: { color: 'Blue Titanium', storage: '256GB' },
      },
      {
        productId: product1.id,
        name: 'Natural Titanium - 512GB',
        sku: 'IPH-15-PRO-NAT-512',
        price: 154900,
        stock: 10,
        attributes: { color: 'Natural Titanium', storage: '512GB' },
      },
      {
        productId: product3.id,
        name: 'Blue - Medium',
        sku: 'MSH-COT-BLU-M',
        stock: 30,
        attributes: { color: 'Blue', size: 'M' },
      },
      {
        productId: product3.id,
        name: 'Blue - Large',
        sku: 'MSH-COT-BLU-L',
        stock: 40,
        attributes: { color: 'Blue', size: 'L' },
      },
      {
        productId: product3.id,
        name: 'Blue - XL',
        sku: 'MSH-COT-BLU-XL',
        stock: 30,
        attributes: { color: 'Blue', size: 'XL' },
      },
    ],
  });

  console.log('✅ Product variants created\n');

  // ============================================================================
  // CREATE ADDRESSES
  // ============================================================================
  console.log('📍 Creating addresses...');

  await prisma.address.createMany({
    data: [
      {
        userId: regularUser1.id,
        type: AddressType.HOME,
        fullName: 'Rahul Sharma',
        phone: '+919876543211',
        addressLine1: '123, MG Road',
        addressLine2: 'Near City Mall',
        landmark: 'Opposite HDFC Bank',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        country: 'India',
        isDefault: true,
      },
      {
        userId: regularUser1.id,
        type: AddressType.WORK,
        fullName: 'Rahul Sharma',
        phone: '+919876543211',
        addressLine1: 'Tech Park, Block A',
        addressLine2: 'Floor 5',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001',
        country: 'India',
        isDefault: false,
      },
      {
        userId: regularUser2.id,
        type: AddressType.HOME,
        fullName: 'Priya Patel',
        phone: '+919876543212',
        addressLine1: '456, Ashram Road',
        city: 'Ahmedabad',
        state: 'Gujarat',
        zipCode: '380009',
        country: 'India',
        isDefault: true,
      },
    ],
  });

  console.log('✅ Addresses created\n');

  // ============================================================================
  // CREATE COUPONS
  // ============================================================================
  console.log('🎫 Creating coupons...');

  await prisma.coupon.createMany({
    data: [
      {
        code: 'WELCOME10',
        description: 'Welcome offer - Get 10% off on your first order',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        minPurchase: 500,
        maxDiscount: 200,
        usageLimit: 1000,
        usagePerUser: 1,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        adminId: admin.id,
      },
      {
        code: 'SAVE500',
        description: 'Flat ₹500 off on orders above ₹5000',
        discountType: DiscountType.FIXED,
        discountValue: 500,
        minPurchase: 5000,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        adminId: admin.id,
      },
      {
        code: 'FREESHIP',
        description: 'Free shipping on all orders',
        discountType: DiscountType.FREE_SHIPPING,
        discountValue: 0,
        minPurchase: 999,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
    ],
  });

  console.log('✅ Coupons created\n');

  // ============================================================================
  // CREATE REVIEWS
  // ============================================================================
  console.log('⭐ Creating reviews...');

  await prisma.review.createMany({
    data: [
      {
        userId: regularUser1.id,
        productId: product1.id,
        rating: 5,
        title: 'Excellent phone!',
        comment: 'Best iPhone yet! Camera quality is amazing and the titanium design feels premium.',
        isVerified: true,
        isApproved: true,
        helpfulCount: 45,
      },
      {
        userId: regularUser2.id,
        productId: product1.id,
        rating: 4,
        title: 'Great but expensive',
        comment: 'Love the phone but wish it was more affordable. Performance is top-notch though!',
        isVerified: true,
        isApproved: true,
        helpfulCount: 23,
      },
      {
        userId: regularUser1.id,
        productId: product3.id,
        rating: 4,
        title: 'Good quality shirt',
        comment: 'Comfortable fabric and good fit. Worth the price.',
        isVerified: true,
        isApproved: true,
        helpfulCount: 12,
      },
      {
        userId: regularUser2.id,
        productId: product4.id,
        rating: 5,
        title: 'Beautiful kurti',
        comment: 'Loved the embroidery work. Perfect for festive occasions!',
        isVerified: true,
        isApproved: true,
        helpfulCount: 18,
      },
    ],
  });

  console.log('✅ Reviews created\n');

  // ============================================================================
  // CREATE WISHLIST
  // ============================================================================
  console.log('❤️ Creating wishlist items...');

  await prisma.wishlist.createMany({
    data: [
      { userId: regularUser1.id, productId: product2.id },
      { userId: regularUser1.id, productId: product5.id },
      { userId: regularUser2.id, productId: product1.id },
      { userId: regularUser2.id, productId: product6.id },
    ],
  });

  console.log('✅ Wishlist items created\n');

  // ============================================================================
  // CREATE SETTINGS
  // ============================================================================
  console.log('⚙️ Creating app settings...');

  await prisma.setting.createMany({
    data: [
      {
        key: 'site_name',
        value: { name: 'BharatCart' },
        category: 'general',
        isPublic: true,
      },
      {
        key: 'site_tagline',
        value: { tagline: 'Your Trusted Online Shopping Destination' },
        category: 'general',
        isPublic: true,
      },
      {
        key: 'currency',
        value: { code: 'INR', symbol: '₹' },
        category: 'general',
        isPublic: true,
      },
      {
        key: 'tax_rate',
        value: { rate: 18 },
        category: 'pricing',
        isPublic: false,
      },
      {
        key: 'shipping_charges',
        value: { standard: 50, express: 100, free_above: 999 },
        category: 'shipping',
        isPublic: true,
      },
      {
        key: 'payment_methods',
        value: {
          methods: ['CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'NET_BANKING', 'WALLET', 'COD'],
        },
        category: 'payment',
        isPublic: true,
      },
    ],
  });

  console.log('✅ App settings created\n');

  // ============================================================================
  // CREATE EMAIL TEMPLATES
  // ============================================================================
  console.log('📧 Creating email templates...');

  await prisma.emailTemplate.createMany({
    data: [
      {
        name: 'welcome_email',
        subject: 'Welcome to BharatCart!',
        body: `
          <h1>Welcome {{userName}}!</h1>
          <p>Thank you for joining BharatCart. We're excited to have you!</p>
          <p>Start shopping now and enjoy exclusive deals.</p>
        `,
        variables: ['userName'],
      },
      {
        name: 'order_confirmation',
        subject: 'Order Confirmed - {{orderNumber}}',
        body: `
          <h1>Order Confirmed!</h1>
          <p>Hi {{userName}},</p>
          <p>Your order {{orderNumber}} has been confirmed.</p>
          <p>Total Amount: {{totalAmount}}</p>
          <p>Expected Delivery: {{deliveryDate}}</p>
        `,
        variables: ['userName', 'orderNumber', 'totalAmount', 'deliveryDate'],
      },
      {
        name: 'order_shipped',
        subject: 'Your Order is Shipped - {{orderNumber}}',
        body: `
          <h1>Your Order is on the way!</h1>
          <p>Hi {{userName}},</p>
          <p>Your order {{orderNumber}} has been shipped.</p>
          <p>Tracking Number: {{trackingNumber}}</p>
        `,
        variables: ['userName', 'orderNumber', 'trackingNumber'],
      },
      {
        name: 'password_reset',
        subject: 'Reset Your Password',
        body: `
          <h1>Reset Your Password</h1>
          <p>Hi {{userName}},</p>
          <p>Click the link below to reset your password:</p>
          <a href="{{resetLink}}">Reset Password</a>
          <p>This link expires in 1 hour.</p>
        `,
        variables: ['userName', 'resetLink'],
      },
    ],
  });

  console.log('✅ Email templates created\n');

  // ============================================================================
  // CREATE NOTIFICATIONS
  // ============================================================================
  console.log('🔔 Creating notifications...');

  await prisma.notification.createMany({
    data: [
      {
        userId: regularUser1.id,
        type: NotificationType.PROMOTION,
        title: 'Special Offer!',
        message: 'Get 10% off on your first order. Use code: WELCOME10',
        link: '/deals',
      },
      {
        userId: regularUser2.id,
        type: NotificationType.PROMOTION,
        title: 'Flash Sale!',
        message: 'Huge discounts on electronics. Limited time offer!',
        link: '/categories/electronics',
      },
    ],
  });

  console.log('✅ Notifications created\n');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('✅ DATABASE SEED COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(70));
  console.log('\n📊 Summary:');
  console.log(`   👥 Users: 3 (1 admin, 2 regular)`);
  console.log(`   🏪 Stores: 1`);
  console.log(`   📂 Categories: 9 (with subcategories)`);
  console.log(`   📦 Products: 7`);
  console.log(`   🎨 Product Variants: 6`);
  console.log(`   📍 Addresses: 3`);
  console.log(`   🎫 Coupons: 3`);
  console.log(`   ⭐ Reviews: 4`);
  console.log(`   ❤️ Wishlist Items: 4`);
  console.log(`   ⚙️ Settings: 6`);
  console.log(`   📧 Email Templates: 4`);
  console.log(`   🔔 Notifications: 2`);
  console.log('\n🔐 Login Credentials:');
  console.log('   Admin: admin@bharatcart.com / password123');
  console.log('   User1: rahul@example.com / password123');
  console.log('   User2: priya@example.com / password123');
  console.log('\n' + '='.repeat(70) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });