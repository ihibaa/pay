
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const cookieStore = await cookies();
    const token = cookieStore.get("paynext_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Please login first." },
        { status: 401 }
      );
    }

    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

    const { payload } = await jwtVerify(token, secret);
    const userId = payload.userId as string;

    // 2. Get top-up details
    const body = await request.json();
    const { mobile, network, amount } = body;

    // 3. Validate mobile number
    if (!/^03\d{9}$/.test(mobile)) {
      return NextResponse.json(
        { error: "Invalid Pakistani mobile number." },
        { status: 400 }
      );
    }

    // 4. Validate network
    const allowedNetworks = ["Jazz", "Zong", "Telenor", "Ufone"];

    if (!allowedNetworks.includes(network)) {
      return NextResponse.json(
        { error: "Invalid mobile network." },
        { status: 400 }
      );
    }

    // 5. Validate amount
    const validAmounts = [100, 200, 300, 500, 1000, 2000];

    if (!validAmounts.includes(Number(amount))) {
      return NextResponse.json(
        { error: "Invalid top-up amount." },
        { status: 400 }
      );
    }

    // 6. Process transaction securely
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new Error("WALLET_NOT_FOUND");
      }

      if (Number(wallet.balance) < Number(amount)) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // Deduct amount only if sufficient balance exists
      const updated = await tx.wallet.updateMany({
        where: {
          userId,
          balance: { gte: Number(amount) },
        },
        data: {
          balance: { decrement: Number(amount) },
        },
      });

      if (updated.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // Save transaction
      const transaction = await tx.transaction.create({
        data: {
          reference: randomUUID(),
          senderId: userId,
          amount: Number(amount),
          type: "MOBILE_TOPUP",
          status: "COMPLETED",
          description: `${network} mobile top-up for ${mobile}`,
        },
      });

      // Save security activity
      await tx.securityLog.create({
        data: {
          userId,
          action: "MOBILE_TOPUP",
          details: `${network} top-up of Rs. ${amount} for ${mobile}`,
        },
      });

      return transaction;
    });

    return NextResponse.json({
      success: true,
      message: "Mobile top-up successful!",
      transactionId: result.reference,
    });

  } catch (error) {
    console.error("Top-up Error:", error);

    if (error instanceof Error) {
      if (error.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          { error: "Insufficient wallet balance." },
          { status: 400 }
        );
      }

      if (error.message === "WALLET_NOT_FOUND") {
        return NextResponse.json(
          { error: "Wallet not found." },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
