import { NextResponse } from "next/server";
import { INITIAL_REGISTRATIONS } from "@/lib/store";
import { InterestRegistration } from "@/lib/types";

let inMemoryRegistrations: InterestRegistration[] = [...INITIAL_REGISTRATIONS];

export async function GET() {
  return NextResponse.json({
    success: true,
    total: inMemoryRegistrations.length,
    registrations: inMemoryRegistrations,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.fullName || !body.email || !body.university) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (fullName, email, university)" },
        { status: 400 }
      );
    }

    const newRecord: InterestRegistration = {
      id: `reg-${Date.now().toString(36)}`,
      fullName: body.fullName,
      email: body.email,
      university: body.university,
      fieldOfStudy: body.fieldOfStudy || "General Computing & AI",
      studyLevel: body.studyLevel || "undergraduate",
      experienceLevel: body.experienceLevel || "first_timer",
      teamStatus: body.teamStatus || "individual_looking",
      primaryTooling: body.primaryTooling || "AI Coding Agents & APIs",
      wantsUpdates: true,
      createdAt: new Date().toISOString(),
    };

    inMemoryRegistrations.unshift(newRecord);

    return NextResponse.json({
      success: true,
      message: "Pre-launch registration confirmed",
      registration: newRecord,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Invalid registration payload" },
      { status: 500 }
    );
  }
}
