
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Check authentication cookie
    const token = request.cookies.get("paynext_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      );
    }

    // Verify JWT using the same secret as login
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      throw new Error("AUTH_SECRET is missing.");
    }

    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);

    const userId = payload.userId as string;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Invalid authentication." },
        { status: 401 }
      );
    }

    // Get deposit amount
    const body = await request.json();
    const amountInput = String(body.amount ?? "").trim();

    // Validate amount format
    if (!/^\d+(\.\d{1,2})?$/.test(amountInput)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid amount." },
        { status: 400 }
      );
    }

    const amount = Number(amountInput);

    if (
      !Number.isFinite(amount) ||
      amount < 100 ||
      amount > 100000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Amount must be between Rs. 100 and Rs. 100,000.",
        },
        { status: 400 }
      );
    }

    // Check whether wallet exists
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return NextResponse.json(
        { success: false, message: "Wallet not found." },
        { status: 404 }
      );
    }

    // Generate unique transaction reference
    const reference = `PN-DEP-${crypto.randomUUID()}`;

    // Update wallet and save transaction together
    const result = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: {
            increment: amountInput,
          },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          reference,
          senderId: userId,
          amount: amountInput,
          type: "DEPOSIT",
          status: "COMPLETED",
          description: "Demo wallet deposit",
        },
      });

      await tx.securityLog.create({
        data: {
          userId,
          action: "DEMO_DEPOSIT",
          details: `Demo deposit of PKR ${amountInput} added to wallet.`,
        },
      });

      return {
        wallet: updatedWallet,
        transaction,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Demo money added successfully!",
      wallet: {
        balance: result.wallet.balance.toString(),
        currency: result.wallet.currency,
      },
      transaction: {
        id: result.transaction.id,
        reference: result.transaction.reference,
        amount: result.transaction.amount.toString(),
        type: result.transaction.type,
        status: result.transaction.status,
        createdAt: result.transaction.createdAt,
      },
    });

  } catch (error) {
    console.error("Deposit API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process demo deposit.",
      },
      { status: 500 }
    );
  }
}
