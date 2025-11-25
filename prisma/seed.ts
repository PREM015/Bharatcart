import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // First, create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Electronics' },
      update: {},
      create: { name: 'Electronics' }
    }),
    prisma.category.upsert({
      where: { name: 'Clothing' },
      update: {},
      create: { name: 'Clothing' }
    }),
    prisma.category.upsert({
      where: { name: 'Beauty' },
      update: {},
      create: { name: 'Beauty' }
    }),
    prisma.category.upsert({
      where: { name: 'Groceries' },
      update: {},
      create: { name: 'Groceries' }
    }),
    prisma.category.upsert({
      where: { name: 'Home Appliances' },
      update: {},
      create: { name: 'Home Appliances' }
    }),
    prisma.category.upsert({
      where: { name: 'Footwear' },
      update: {},
      create: { name: 'Footwear' }
    }),
    prisma.category.upsert({
      where: { name: 'Accessories' },
      update: {},
      create: { name: 'Accessories' }
    })
  ])

  // Create a demo admin user
  const user = await prisma.user.upsert({
    where: { email: 'admin@bharatcart.com' },
    update: {},
    create: {
      name: 'BharatCart Admin',
      email: 'admin@bharatcart.com',
      password: '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // Use bcrypt hash
      isAdmin: true
    }
  })

  const admin = await prisma.admin.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      storeName: 'BharatCart',
      storeUrl: 'bharatcart',
      isVerified: true
    }
  })

  // Sample products with correct image paths
  const products = [
    // Electronics
    {
      title: 'Premium Smartphone',
      description: 'Latest flagship smartphone with advanced features',
      price: 49999,
      categoryId: categories[0].id,
      adminId: admin.id,
      image: '/images/products/electronics/mobiles/img1.webp',
      stock: 50,
      brand: 'Samsung',
      isNew: true,
      isFeatured: true,
      rating: 4.5
    },
    {
      title: 'Gaming Laptop',
      description: 'High-performance gaming laptop',
      price: 89999,
      categoryId: categories[0].id,
      adminId: admin.id,
      image: '/images/products/electronics/laptops/img1.webp',
      stock: 30,
      brand: 'Dell',
      isNew: true,
      rating: 4.7
    },
    {
      title: 'Smart TV 55"',
      description: '4K Ultra HD Smart Television',
      price: 54999,
      categoryId: categories[0].id,
      adminId: admin.id,
      image: '/images/products/electronics/televisions/img1.webp',
      stock: 20,
      brand: 'LG',
      isFeatured: true,
      rating: 4.6
    },
    
    // Clothing
    {
      title: 'Men Casual Shirt',
      description: 'Comfortable cotton casual shirt',
      price: 1299,
      categoryId: categories[1].id,
      adminId: admin.id,
      image: '/images/products/clothing/men/shirts/img1.webp',
      stock: 100,
      brand: 'Nike',
      discountPercentage: 20,
      rating: 4.3
    },
    {
      title: 'Women Ethnic Dress',
      description: 'Traditional ethnic wear',
      price: 2499,
      categoryId: categories[1].id,
      adminId: admin.id,
      image: '/images/products/clothing/women/ethnic/img1.webp',
      stock: 75,
      brand: 'Zara',
      isNew: true,
      rating: 4.4
    },
    {
      title: 'Baby Clothing Set',
      description: 'Cute baby dress collection',
      price: 799,
      categoryId: categories[1].id,
      adminId: admin.id,
      image: '/images/products/clothing/kids/baby/img1.webp',
      stock: 60,
      rating: 4.5
    },

    // Beauty
    {
      title: 'Premium Perfume',
      description: 'Long-lasting luxury fragrance',
      price: 3999,
      categoryId: categories[2].id,
      adminId: admin.id,
      image: '/images/products/beauty/fragrances/img1.png',
      stock: 40,
      brand: 'Unilever',
      isFeatured: true,
      rating: 4.6
    },
    {
      title: 'Skincare Set',
      description: 'Complete skincare routine',
      price: 2999,
      categoryId: categories[2].id,
      adminId: admin.id,
      image: '/images/products/beauty/skincare/img1.jpg',
      stock: 50,
      discountPercentage: 15,
      rating: 4.5
    },

    // Home Appliances
    {
      title: 'Washing Machine',
      description: 'Fully automatic washing machine',
      price: 24999,
      categoryId: categories[4].id,
      adminId: admin.id,
      image: '/images/products/home-appliances/laundry/img1.webp',
      stock: 15,
      brand: 'LG',
      rating: 4.4
    },
    {
      title: 'Microwave Oven',
      description: 'Multi-function microwave',
      price: 8999,
      categoryId: categories[4].id,
      adminId: admin.id,
      image: '/images/products/home-appliances/kitchen/img1.webp',
      stock: 25,
      brand: 'Samsung',
      rating: 4.3
    },

    // Footwear
    {
      title: 'Running Shoes',
      description: 'Comfortable sports shoes',
      price: 3499,
      categoryId: categories[5].id,
      adminId: admin.id,
      image: '/images/products/footwear/men/img1.webp',
      stock: 80,
      brand: 'Nike',
      isNew: true,
      rating: 4.5
    },
    {
      title: 'Women Heels',
      description: 'Elegant party wear heels',
      price: 2999,
      categoryId: categories[5].id,
      adminId: admin.id,
      image: '/images/products/footwear/women/img1.webp',
      stock: 60,
      rating: 4.4
    },

    // Accessories
    {
      title: 'Luxury Watch',
      description: 'Premium analog watch',
      price: 12999,
      categoryId: categories[6].id,
      adminId: admin.id,
      image: '/images/products/accessories/watches/img1.jpg',
      stock: 30,
      isFeatured: true,
      rating: 4.7
    },
    {
      title: 'Designer Handbag',
      description: 'Stylish leather handbag',
      price: 4999,
      categoryId: categories[6].id,
      adminId: admin.id,
      image: '/images/products/accessories/bags/img1.jpg',
      stock: 45,
      discountPercentage: 25,
      rating: 4.5
    },

    // Groceries
    {
      title: 'Fresh Fruits Pack',
      description: 'Seasonal fresh fruits',
      price: 499,
      categoryId: categories[3].id,
      adminId: admin.id,
      image: '/images/products/groceries/fruits/img1.webp',
      stock: 100,
      brand: 'Nestle',
      rating: 4.3
    },
    {
      title: 'Dairy Products',
      description: 'Fresh milk and dairy',
      price: 299,
      categoryId: categories[3].id,
      adminId: admin.id,
      image: '/images/products/groceries/dairy/img1.webp',
      stock: 150,
      rating: 4.4
    }
  ]

  // Create products
  for (const product of products) {
    await prisma.product.upsert({
      where: { id: 'temp-id-' + product.title.replace(/\s+/g, '-').toLowerCase() },
      update: {},
      create: product
    })
  }

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })