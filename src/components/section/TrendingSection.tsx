'use client';

import React from 'react';
import ProductCard from '@/components/ui/ProductCard';

const trendingProducts = [
  {
    id: '101',
    title: 'Bluetooth Speaker',
    description: 'Portable wireless speaker with deep bass and long battery life.',
    price: 1799,
    image: '/images/products/electronics/accessories/img1.webp', // updated path
    stock: 25,
    isNew: true,
    isFeatured: true,
    brand: 'Acme Audio',
    rating: 4.5,
    discountPercentage: 10,
    categoryId: 'audio',
  },
  {
    id: '102',
    title: 'Fitness Smartwatch',
    description: 'Fitness tracker with heart-rate monitoring and GPS.',
    price: 3999,
    image: '/images/products/accessories/watches/img1.jpg', // updated path
    stock: 40,
    isNew: true,
    isFeatured: false,
    brand: 'FitPro',
    rating: 4.2,
    discountPercentage: 5,
    categoryId: 'wearables',
  },
  {
    id: '103',
    title: 'Gaming Mouse',
    description: 'Ergonomic gaming mouse with customizable DPI and RGB lighting.',
    price: 1299,
    image: '/images/products/electronics/gaming/img1.webp', // updated path
    stock: 60,
    isNew: false,
    isFeatured: false,
    brand: 'GamerTech',
    rating: 4.7,
    discountPercentage: 15,
    categoryId: 'gaming',
  },
  {
    id: '104',
    title: 'Cotton Kurta',
    description: 'Comfortable breathable cotton kurta for everyday wear.',
    price: 1099,
    image: '/images/products/clothing/men/ethnic/img1.webp', // updated path
    stock: 80,
    isNew: false,
    isFeatured: true,
    brand: null,
    rating: 4.1,
    discountPercentage: 0,
    categoryId: 'apparel',
  },
  {
    id: '105',
    title: 'Ceramic Dinner Set',
    description: '12-piece ceramic dinner set with elegant finish.',
    price: 2499,
    image: '/images/products/home-appliances/kitchen/img1.webp', // updated path
    stock: 15,
    isNew: false,
    isFeatured: false,
    brand: 'HomeGoods',
    rating: 4.3,
    discountPercentage: 8,
    categoryId: 'home',
  },
  {
    id: '106',
    title: 'Laptop Stand',
    description: 'Adjustable aluminum laptop stand for improved ergonomics.',
    price: 899,
    image: '/images/products/accessories/bags/img1.jpg', // updated path
    stock: 100,
    isNew: true,
    isFeatured: false,
    brand: 'DeskEase',
    rating: 4.4,
    discountPercentage: 12,
    categoryId: 'accessories',
  },
];

const TrendingSection = () => {
  return (
    <section className="w-full py-16 px-4 md:px-10 bg-yellow-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
            Just In <span className="text-yellow-600">Trending Picks</span>
          </h2>
          <p className="text-sm md:text-base text-gray-500 mt-2">
            Handpicked items people are loving right now
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {trendingProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingSection;
