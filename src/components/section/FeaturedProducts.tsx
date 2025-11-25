'use client';

import React from 'react';
import ProductCard from '@/components/ui/ProductCard';

const featuredProducts = [
  {
    id: '1',
    title: 'Wireless Headphones',
    description: 'High quality wireless headphones',
    price: 3499,
    image: '/images/products/clothing/kids/baby/img2.jpg',
    stock: 50,
    isNew: true,
    isFeatured: true,
    brand: 'Sony',
    rating: 4.5,
    discountPercentage: 10,
    categoryId: 'electronics',
  },
  {
    id: '2',
    title: 'Smartphone 5G',
    description: 'Latest 5G smartphone with amazing features',
    price: 19999,
    image: '/images/products/electronics/mobiles/img1.jpg', // updated path
    stock: 30,
    isNew: true,
    isFeatured: true,
    brand: 'Samsung',
    rating: 4.8,
    discountPercentage: 5,
    categoryId: 'electronics',
  },
  {
    id: '3',
    title: 'Sneakers (Men)',
    description: 'Comfortable and stylish sneakers',
    price: 2599,
    image: '/images/products/clothing/men/jeans/img1.webp',
    stock: 100,
    isNew: true,
    isFeatured: true,
    brand: 'Nike',
    rating: 4.7,
    discountPercentage: 15,
    categoryId: 'footwear',
  },
  {
    id: '4',
    title: 'Kitchen Mixer',
    description: 'Powerful kitchen mixer for daily use',
    price: 4499,
    image: '/images/products/home-appliances/kitchen/img1.webp', // updated path
    stock: 20,
    isNew: true,
    isFeatured: true,
    brand: 'Philips',
    rating: 4.3,
    discountPercentage: 8,
    categoryId: 'home-appliances',
  },
  {
    id: '5',
    title: 'LED Smart TV',
    description: '55-inch LED Smart TV with 4K resolution',
    price: 32999,
    image: '/images/products/electronics/televisions/img1.webp', // updated path
    stock: 10,
    isNew: false,
    isFeatured: true,
    brand: 'LG',
    rating: 4.6,
    discountPercentage: 12,
    categoryId: 'electronics',
  },
  {
    id: '6',
    title: 'Perfume Spray',
    description: 'Long-lasting fragrance perfume',
    price: 899,
    image: '/images/products/beauty/fragrances/img1.png',
    stock: 60,
    isNew: true,
    isFeatured: true,
    brand: 'Dior',
    rating: 4.4,
    discountPercentage: 20,
    categoryId: 'beauty',
  },
];

const FeaturedProductsSection = () => {
  return (
    <section className="w-full py-16 px-4 md:px-10 bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">
            Handpicked <span className="text-indigo-500">Favorites</span>
          </h2>
          <p className="mt-2 text-sm md:text-base text-gray-500">
            Explore premium picks trending across all categories
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProductsSection;
