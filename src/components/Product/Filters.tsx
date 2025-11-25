'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import React from 'react';

const categories = [
  { name: 'Clothing' },
  { name: 'Electronics' },
  { name: 'Groceries' },
  { name: 'Footwear' },
  { name: 'Accessories' },
  { name: 'Beauty' },
  { name: 'Home Appliances' },
];

const brands = [
  { name: 'Nike' },
  { name: 'Zara' },
  { name: 'Samsung' },
  { name: 'Apple' },
  { name: 'Sony' },
  { name: 'LG' },
  { name: 'Dell' },
  { name: 'HP' },
  { name: 'Nestle' },
  { name: 'Unilever' },
];

export default function Filters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/product?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <select
        className="border p-2 rounded"
        value={searchParams.get('category') || ''}
        onChange={(e) => setFilter('category', e.target.value)}
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat.name} value={cat.name}>
            {cat.name}
          </option>
        ))}
      </select>

      <select
        className="border p-2 rounded"
        value={searchParams.get('brand') || ''}
        onChange={(e) => setFilter('brand', e.target.value)}
      >
        <option value="">All Brands</option>
        {brands.map((brand) => (
          <option key={brand.name} value={brand.name}>
            {brand.name}
          </option>
        ))}
      </select>

      <input
        type="text"
        className="border p-2 rounded flex-1"
        placeholder="Search products..."
        defaultValue={searchParams.get('q') || ''}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setFilter('q', (e.target as HTMLInputElement).value);
        }}
      />
    </div>
  );
}
