import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET() {
  try {
    await prisma.$connect();

    return NextResponse.json({
      success: true,
      message: "PayNext database connected successfully!",
    });
  } catch (error) {
    console.error("Database connection error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed.",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}