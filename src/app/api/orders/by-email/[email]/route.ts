// File: src/app/api/orders/[email]/route.ts
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * Types for order creation
 */
type OrderItemInput = {
  productId: string;
  quantity: number;
  price: number;
};

type OrderBody = {
  userId: string;
  adminId: string;
  totalAmount: number;
  shippingAddress: string;
  status?: "PENDING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  items: OrderItemInput[];
};

/**
 * GET /api/orders/[email]
 * Returns all orders for a specific user by email
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ email: string }> } // <- Next.js v15 expects Promise
) {
  try {
    const { email } = await context.params; // unwrap Promise

    const orders = await prisma.order.findMany({
      where: { userEmail: email },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders/[email]
 * Create a new order for the user
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ email: string }> } // <- Next.js v15 expects Promise
) {
  try {
    const { email } = await context.params; // unwrap Promise
    const body: OrderBody = await req.json();

    const newOrder = await prisma.order.create({
      data: {
        userEmail: email,
        userId: body.userId,
        adminId: body.adminId,
        totalAmount: body.totalAmount,
        status: body.status || "PENDING",
        shippingAddress: body.shippingAddress,
        items: {
          create: body.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
