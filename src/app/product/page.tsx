import React, { Suspense } from 'react';
import Filters from '@/components/Product/Filters';
import ProductList from '@/components/Product/ProductList';

export const dynamic = 'force-dynamic';

export default function ProductPage() {
  return (
    <section className="px-4 py-8 md:px-8 lg:px-16">
      <h1 className="text-2xl font-bold mb-6">Products</h1>
      <Suspense fallback={<p>Loading filters...</p>}>
        <Filters />
      </Suspense>
      <Suspense fallback={<p>Loading products...</p>}>
        <ProductList />
      </Suspense>
    </section>
  );
}
