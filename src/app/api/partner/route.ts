import { NextResponse } from "next/server";
import { INITIAL_INQUIRIES } from "@/lib/store";
import { PartnerInquiry } from "@/lib/types";

let inMemoryInquiries: PartnerInquiry[] = [...INITIAL_INQUIRIES];

export async function GET() {
  return NextResponse.json({
    success: true,
    total: inMemoryInquiries.length,
    inquiries: inMemoryInquiries,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.companyName || !body.contactName || !body.workEmail) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (companyName, contactName, workEmail)" },
        { status: 400 }
      );
    }

    const newRecord: PartnerInquiry = {
      id: `inq-${Date.now().toString(36)}`,
      companyName: body.companyName,
      contactName: body.contactName,
      workEmail: body.workEmail,
      involvementInterests: body.involvementInterests || ["General Sponsorship"],
      proposedChallengeIdea: body.proposedChallengeIdea || "",
      message: body.message || "",
      createdAt: new Date().toISOString(),
    };

    inMemoryInquiries.unshift(newRecord);

    return NextResponse.json({
      success: true,
      message: "Partner inquiry recorded",
      inquiry: newRecord,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Invalid partner inquiry payload" },
      { status: 500 }
    );
  }
}
