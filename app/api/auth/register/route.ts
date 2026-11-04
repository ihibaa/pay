
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim();
    const password = body.password;

    // Check required fields
    if (!fullName || !email || !phone || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required.",
        },
        { status: 400 }
      );
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email.",
        },
        { status: 400 }
      );
    }

    // Validate password
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    // Validate phone number
    if (!/^\+?[0-9]{10,15}$/.test(phone)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid phone number.",
        },
        { status: 400 }
      );
    }

    // Check if email or phone already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Email or phone number is already registered.",
        },
        { status: 409 }
      );
    }

    // Securely hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user, wallet and security log
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash,

        wallet: {
          create: {
            balance: 0,
            currency: "PKR",
          },
        },

        securityLogs: {
          create: {
            action: "ACCOUNT_REGISTERED",
            details: "New PayNext account created.",
          },
        },
      },

      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        createdAt: true,

        wallet: {
          select: {
            id: true,
            balance: true,
            currency: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "PayNext account created successfully!",
        user,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Registration error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong during registration.",
      },
      { status: 500 }
    );
  }
}
