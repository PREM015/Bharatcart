'use client';

import React from 'react';
import ProductCard from '@/components/ui/ProductCard';

const newArrivalProducts = [
  {
    id: '101',
    title: 'Bluetooth Neckband',
    description: 'Lightweight neckband with clear audio and long battery life.',
    price: 1499,
    image: '/images/products/electronics/accessories/img2.webp', // updated path
    stock: 25,
    isNew: true,
    isFeatured: true,
    brand: 'AudioX',
    rating: 4.3,
    discountPercentage: 10,
    categoryId: 'accessories',
  },
  {
    id: '102',
    title: "Women’s Handbag",
    description: 'Stylish faux-leather handbag with multiple compartments.',
    price: 2199,
    image: '/images/products/accessories/bags/img1.jpg', // updated path
    stock: 8,
    isNew: true,
    isFeatured: false,
    brand: 'FashionCo',
    rating: 4.6,
    discountPercentage: 0,
    categoryId: 'fashion',
  },
  {
    id: '103',
    title: 'Fitness Smartwatch',
    description: 'Track workouts and health metrics with this durable smartwatch.',
    price: 3299,
    image: '/images/products/accessories/watches/img1.jpg', // updated path
    stock: 12,
    isNew: true,
    isFeatured: true,
    brand: 'FitTech',
    rating: 4.4,
    discountPercentage: 15,
    categoryId: 'wearables',
  },
  {
    id: '104',
    title: 'Air Purifier',
    description: 'Compact purifier with HEPA filter for clean indoor air.',
    price: 7599,
    image: '/images/products/home-appliances/kitchen/img1.webp', // updated path
    stock: 5,
    isNew: false,
    isFeatured: false,
    brand: 'PureAir',
    rating: 4.2,
    discountPercentage: 5,
    categoryId: 'home',
  },
  {
    id: '105',
    title: 'Hair Dryer',
    description: 'Fast-drying hair dryer with ionic technology to reduce frizz.',
    price: 1299,
    image: '/images/products/beauty/haircare/img1.png', // updated path
    stock: 30,
    isNew: false,
    isFeatured: false,
    brand: 'GlamPro',
    rating: 4.0,
    discountPercentage: 0,
    categoryId: 'beauty',
  },
  {
    id: '106',
    title: 'Laptop Backpack',
    description: 'Padded laptop backpack with multiple pockets and USB charging port.',
    price: 1799,
    image: '/images/products/accessories/bags/img2.jpg', // updated path
    stock: 18,
    isNew: true,
    isFeatured: false,
    brand: null,
    rating: 4.1,
    discountPercentage: 20,
    categoryId: 'bags',
  },
];

const NewArrivals = () => {
  return (
    <section className="w-full py-16 px-4 md:px-10 bg-sky-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-800">
            Fresh Finds <span className="text-sky-600">Just In</span>
          </h2>
          <p className="mt-2 text-sm md:text-base text-gray-500">
            Check out our newest additions curated just for you
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {newArrivalProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewArrivals;
