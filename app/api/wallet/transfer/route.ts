
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "../../../lib/prisma";
import { randomUUID } from "node:crypto";

export async function POST(request: NextRequest) {
  try {
    // 1. Check login authentication
    const token = request.cookies.get("paynext_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Please login first." },
        { status: 401 }
      );
    }

    // 2. Verify JWT token
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      throw new Error("AUTH_SECRET is missing.");
    }

    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    const senderId = payload.userId as string;

    if (!senderId) {
      return NextResponse.json(
        { success: false, message: "Invalid authentication." },
        { status: 401 }
      );
    }

    // 3. Get receiver phone and amount
    const body = await request.json();

    const phone = String(body.phone ?? "").trim();
    const amountInput = String(body.amount ?? "").trim();

    // 4. Validate phone number
    if (!/^\+?[0-9]{10,15}$/.test(phone)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid phone number." },
        { status: 400 }
      );
    }

    // 5. Validate transfer amount
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
          message: "Transfer must be between Rs. 100 and Rs. 100,000.",
        },
        { status: 400 }
      );
    }

    // 6. Find receiver account
    const receiver = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        fullName: true,
        phone: true,
      },
    });

    if (!receiver) {
      return NextResponse.json(
        {
          success: false,
          message: "No PayNext account found with this phone number.",
        },
        { status: 404 }
      );
    }

    // 7. Prevent self-transfer
    if (receiver.id === senderId) {
      return NextResponse.json(
        {
          success: false,
          message: "You cannot send money to yourself.",
        },
        { status: 400 }
      );
    }

    // 8. Check sender wallet
    const senderWallet = await prisma.wallet.findUnique({
      where: { userId: senderId },
    });

    if (!senderWallet) {
      return NextResponse.json(
        { success: false, message: "Your wallet was not found." },
        { status: 404 }
      );
    }

    // 9. Generate transaction reference
    const reference = `PN-TRF-${randomUUID()}`;

    // 10. Fraud detection and money transfer
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      const tenMinutesAgo = new Date(
        now.getTime() - 10 * 60 * 1000
      );

      const oneHourAgo = new Date(
        now.getTime() - 60 * 60 * 1000
      );

      // Count transfers in the last 10 minutes
      const recentTransfers = await tx.transaction.count({
        where: {
          senderId,
          type: "TRANSFER",
          status: "COMPLETED",
          createdAt: {
            gte: tenMinutesAgo,
          },
        },
      });

      // Count transfers in the last hour
      const hourlyTransfers = await tx.transaction.count({
        where: {
          senderId,
          type: "TRANSFER",
          status: "COMPLETED",
          createdAt: {
            gte: oneHourAgo,
          },
        },
      });

      // 11. Calculate fraud risk score
      let riskScore = 0;
      const reasons: string[] = [];

      if (amount >= 50000) {
        riskScore += 30;
        reasons.push("Large transaction amount");
      }

      if (recentTransfers >= 3) {
        riskScore += 40;
        reasons.push("Multiple transfers within 10 minutes");
      }

      if (hourlyTransfers >= 5) {
        riskScore += 30;
        reasons.push("Frequent transfers within 1 hour");
      }

      // 12. Determine risk level
      let riskLevel = "LOW";

      if (riskScore >= 70) {
        riskLevel = "HIGH";
      } else if (riskScore >= 40) {
        riskLevel = "MEDIUM";
      }

      // 13. Block high-risk transactions
      if (riskLevel === "HIGH") {
        const blockedTransaction = await tx.transaction.create({
          data: {
            reference,
            senderId,
            receiverId: receiver.id,
            amount: amountInput,
            type: "TRANSFER",
            status: "BLOCKED",
            description: "Blocked due to suspicious activity",
          },
        });

        await tx.fraudAlert.create({
          data: {
            userId: senderId,
            transactionId: blockedTransaction.id,
            riskScore,
            reason: reasons.join(", "),
            status: "BLOCKED",
          },
        });

        await tx.securityLog.create({
          data: {
            userId: senderId,
            action: "FRAUD_TRANSACTION_BLOCKED",
            details: `Transfer of PKR ${amountInput} blocked. Risk score: ${riskScore}. Reasons: ${reasons.join(", ")}`,
          },
        });

        return {
          blocked: true,
          riskScore,
          riskLevel,
          transaction: blockedTransaction,
        };
      }

      // 14. Deduct money from sender wallet
      const deduction = await tx.wallet.updateMany({
        where: {
          userId: senderId,
          balance: {
            gte: amountInput,
          },
        },
        data: {
          balance: {
            decrement: amountInput,
          },
        },
      });

      if (deduction.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // 15. Add money to receiver wallet
      const receiverWallet = await tx.wallet.update({
        where: {
          userId: receiver.id,
        },
        data: {
          balance: {
            increment: amountInput,
          },
        },
      });

      // 16. Save completed transaction
      const transaction = await tx.transaction.create({
        data: {
          reference,
          senderId,
          receiverId: receiver.id,
          amount: amountInput,
          type: "TRANSFER",
          status: "COMPLETED",
          description: `Money sent to ${receiver.fullName}`,
        },
      });

      // 17. Create medium-risk fraud alert
      if (riskLevel === "MEDIUM") {
        await tx.fraudAlert.create({
          data: {
            userId: senderId,
            transactionId: transaction.id,
            riskScore,
            reason: reasons.join(", "),
            status: "REVIEW",
          },
        });
      }

      // 18. Save security activity log
      await tx.securityLog.create({
        data: {
          userId: senderId,
          action: "MONEY_TRANSFER",
          details: `Transferred PKR ${amountInput} to ${receiver.fullName}. Risk: ${riskLevel}. Score: ${riskScore}. Reference: ${reference}`,
        },
      });

      return {
        blocked: false,
        riskScore,
        riskLevel,
        receiverBalance: receiverWallet.balance.toString(),
        transaction,
      };
    });

    // 19. Return blocked transaction response
    if (result.blocked) {
      return NextResponse.json(
        {
          success: false,
          blocked: true,
          message: "Transaction blocked due to suspicious activity.",
          riskScore: result.riskScore,
          riskLevel: result.riskLevel,
          reference: result.transaction.reference,
        },
        { status: 403 }
      );
    }

    // 20. Return successful response
    return NextResponse.json({
      success: true,
      message: "Money transferred successfully!",
      receiver: {
        name: receiver.fullName,
        phone: receiver.phone,
      },
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      transaction: {
        id: result.transaction.id,
        reference: result.transaction.reference,
        amount: result.transaction.amount.toString(),
        status: result.transaction.status,
        createdAt: result.transaction.createdAt,
      },
    });

  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INSUFFICIENT_BALANCE"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Insufficient wallet balance.",
        },
        { status: 400 }
      );
    }

    console.error("Transfer API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process transfer.",
      },
      { status: 500 }
    );
  }
}
