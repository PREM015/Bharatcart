/**
 * ProductCard Component Snapshot Test
 */

import React from 'react';
import { render } from '@testing-library/react';
import ProductCard from '@/components/ProductCard';

const mockProduct = {
  id: 1,
  name: 'iPhone 15 Pro',
  price: 99999,
  image: '/images/iphone.jpg',
  rating: 4.5,
  inStock: true,
};

describe('ProductCard Component Snapshots', () => {
  it('renders product card', () => {
    const { container } = render(<ProductCard product={mockProduct} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders out of stock product', () => {
    const { container } = render(
      <ProductCard product={{ ...mockProduct, inStock: false }} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders product on sale', () => {
    const { container } = render(
      <ProductCard 
        product={{ ...mockProduct, compareAtPrice: 109999 }} 
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
