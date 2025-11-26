import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'page | Checkout',
};

export default function CheckoutpagePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">page</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Checkout form */}
        </div>
        <div>
          {/* Order summary */}
        </div>
      </div>
    </div>
  );
}
