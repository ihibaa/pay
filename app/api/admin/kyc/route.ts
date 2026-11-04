
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/app/lib/prisma";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

async function getAdminId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("paynext_token")?.value;

  if (!token) return null;

  const { payload } = await jwtVerify(token, secret);

  if (typeof payload.userId !== "string") return null;

  const admin = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true },
  });

  if (!admin || admin.role !== "ADMIN") return null;

  return admin.id;
}

// Get all KYC applications
export async function GET() {
  try {
    const adminId = await getAdminId();

    if (!adminId) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const applications = await prisma.kycApplication.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("KYC admin GET error:", error);

    return NextResponse.json(
      { error: "Unable to load KYC applications." },
      { status: 500 }
    );
  }
}

// Approve or reject a KYC application
export async function PATCH(request: Request) {
  try {
    const adminId = await getAdminId();

    if (!adminId) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { applicationId, status, rejectionNote } = body;

    if (
      typeof applicationId !== "string" ||
      !["APPROVED", "REJECTED"].includes(status)
    ) {
      return NextResponse.json(
        { error: "Invalid KYC decision." },
        { status: 400 }
      );
    }

    if (
      status === "REJECTED" &&
      (typeof rejectionNote !== "string" || !rejectionNote.trim())
    ) {
      return NextResponse.json(
        { error: "Please provide a rejection reason." },
        { status: 400 }
      );
    }

    const application = await prisma.kycApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application || application.status !== "PENDING") {
      return NextResponse.json(
        { error: "Pending KYC application not found." },
        { status: 404 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.kycApplication.updateMany({
        where: {
          id: applicationId,
          status: "PENDING",
        },
        data: {
          status,
          reviewedAt: new Date(),
          rejectionNote:
            status === "REJECTED" ? rejectionNote.trim() : null,
        },
      });

      if (result.count === 0) {
        throw new Error("APPLICATION_ALREADY_REVIEWED");
      }

      await tx.securityLog.create({
        data: {
          userId: application.userId,
          action: `KYC_${status}`,
          details: `KYC application ${applicationId} ${status.toLowerCase()} by admin ${adminId}.`,
        },
      });

      return result;
    });

    return NextResponse.json({
      success: true,
      message: `KYC application ${status.toLowerCase()} successfully.`,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "APPLICATION_ALREADY_REVIEWED"
    ) {
      return NextResponse.json(
        { error: "This application has already been reviewed." },
        { status: 409 }
      );
    }

    console.error("KYC admin PATCH error:", error);

    return NextResponse.json(
      { error: "Unable to update KYC application." },
      { status: 500 }
    );
  }
}
