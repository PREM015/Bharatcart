import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    // Parse JSON safely
    let body: { identifier?: string; password?: string; mode?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { identifier, password, mode = "login" } = body;

    // Validate request
    if (mode !== "login") return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    if (!identifier || !password) return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    if (!process.env.JWT_SECRET) return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });

    const isEmail = identifier.includes("@");
    const user = await prisma.user.findFirst({
      where: isEmail ? { email: identifier.toLowerCase() } : { phone: identifier },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!user.password) return NextResponse.json({ error: "Password login not enabled for this account" }, { status: 400 });

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return NextResponse.json({ error: "Invalid password" }, { status: 401 });

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, phone: user.phone, role: user.role, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        isAdmin: user.isAdmin,
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
