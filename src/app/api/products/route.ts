import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const categoryName = searchParams.get("category");
    const brand = searchParams.get("brand");
    const query = searchParams.get("q");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // FIX 1 — Convert category NAME → categoryId
    if (categoryName) {
      const category = await prisma.category.findFirst({
        where: { name: { equals: categoryName, mode: "insensitive" } },
      });

      if (!category) {
        return NextResponse.json([]); // no products for this category
      }

      where.categoryId = category.id;
    }

    // FIX 2 — Brand filter
    if (brand) {
      where.brand = { equals: brand, mode: "insensitive" };
    }

    // FIX 3 — Search by title or description
    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    // FIX 4 — Return product + relations
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        admin: { select: { storeName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    return NextResponse.json([], { status: 200 }); // IMPORTANT: return array
  }
}
