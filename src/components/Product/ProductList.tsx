'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ui/ProductCard';
import SkeletonProductCard from '@/components/ui/SkeletonProductCard';

type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  brand?: string | null;
  category?: string | null;
};

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams(searchParams.toString()).toString();
        const res = await fetch(`/api/products?${query}`, { cache: 'no-store' });
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error('❌ Failed to fetch products', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonProductCard key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return <p className="text-center text-gray-500">No products found.</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={{
            id: product.id,
            title: product.name,
            description: product.description ?? '',
            price: product.price,
            image: product.image || '/images/placeholder.png',
            stock: 0,
            isNew: false,
            isFeatured: false,
            brand: product.brand ?? '',
            rating: 0,
            discountPercentage: 0,
         categoryName: product.category?.name ?? ''

          }}
        />
      ))}
    </div>
  );
}
