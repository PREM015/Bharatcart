/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const categoryName = searchParams.get("category");
    const brand = searchParams.get("brand");
    const query = searchParams.get("q");

    // Prisma "where" object
    const where: Record<string, any> = {};

    // 1️⃣ Convert category NAME → categoryId
    if (categoryName) {
      const category = await prisma.category.findFirst({
        where: { name: { equals: categoryName, mode: "insensitive" } },
      });

      if (!category) {
        // No products found for this category
        return NextResponse.json([]);
      }

      where.categoryId = category.id;
    }

    // 2️⃣ Brand filter
    if (brand) {
      where.brand = { equals: brand, mode: "insensitive" };
    }

    // 3️⃣ Search by title OR description
    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    // 4️⃣ Fetch products + relations
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true, // include category details
        admin: { select: { storeName: true } }, // include admin/store info
      },
      orderBy: { createdAt: "desc" },
      take: 50, // limit to 50 results
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    // Return empty array even on error to avoid breaking frontend
    return NextResponse.json([], { status: 200 });
  }
}
