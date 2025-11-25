/* eslint-disable react/jsx-no-comment-textnodes */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

export default function CartPage() {
  // Example cart state – in real app, fetch from API or global store
  const [cart, setCart] = useState<CartItem[]>([
    { id: "1", name: "Sample Product", price: 500, quantity: 1 },
    { id: "2", name: "Another Product", price: 300, quantity: 2 },
  ]);

  // Update quantity of a cart item
  const updateQuantity = (id: string, quantity: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(quantity, 1) } : item
      )
    );
  };

  // Remove an item from cart
  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculate total price
  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>

      {cart.length === 0 ? (
        <p className="text-gray-500 text-center">Your cart is empty.</p>
      ) : (
        <div className="space-y-4">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border p-4 rounded-lg"
            >
              <div className="flex items-center gap-4">
                {/* Show image or placeholder */}
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image || "/ui/placeholder.png"}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div>
                  <h2 className="font-semibold">{item.name}</h2>
                  <p className="text-gray-600">₹{item.price}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={item.quantity}
                  min={1}
                  aria-label={`Quantity of ${item.name}`}
                  className="w-16 border rounded px-2 py-1"
                  onChange={(e) =>
                    updateQuantity(item.id, Number(e.target.value))
                  }
                />
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center mt-6 border-t pt-4">
            <h2 className="text-lg font-bold">Total:</h2>
            <p className="text-lg font-bold">₹{total}</p>
          </div>

          <button
            onClick={() => alert("Checkout clicked!")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-4"
          >
            Checkout
          </button>
        </div>
      )}
    </div>
  );
}
