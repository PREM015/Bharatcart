import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendResetEmail } from "@/lib/emailClient";

// Optional: simple in-memory rate limiter (per IP)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;
const rateLimitStore: Record<string, { count: number; lastRequest: number }> = {};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = body?.identifier?.trim();

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json(
        { error: "Valid email or phone is required." },
        { status: 400 }
      );
    }

    // Rate limit check (optional)
    const ip = req.headers.get("x-forwarded-for") || req.ip || "unknown";
    const now = Date.now();
    if (!rateLimitStore[ip]) rateLimitStore[ip] = { count: 0, lastRequest: now };
    if (now - rateLimitStore[ip].lastRequest > RATE_LIMIT_WINDOW) {
      rateLimitStore[ip] = { count: 0, lastRequest: now };
    }
    rateLimitStore[ip].count++;
    if (rateLimitStore[ip].count > MAX_REQUESTS_PER_WINDOW) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 }
      );
    }

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
      },
    });

    // Always return success message to avoid enumeration
    if (!user) {
      return NextResponse.json({
        message:
          "If an account exists for this identifier, a reset link has been sent.",
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Save token to DB
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
        used: false,
        // optional: store request IP
        ipAddress: ip,
      },
    });

    // Construct reset link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    // Send reset email via Resend
    await sendResetEmail(user.email, resetLink);

    return NextResponse.json({
      message:
        "If an account exists for this identifier, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}


