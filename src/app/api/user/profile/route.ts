import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { user as userTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatAddress } from "@/helpers/address";

interface ProfileUpdateBody {
  name?: string;
  phoneNumber?: string;
  countryCode?: string;
  vatNumber?: string;
  companyName?: string;
  companyPosition?: string;
  address?: {
    country: string;
    city: string;
    street: string;
    postalCode: string;
  };
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ProfileUpdateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, phoneNumber, countryCode, vatNumber, companyName, companyPosition, address } = body;

  // Build only the fields the client actually sent
  const updates: Record<string, unknown> = {};

  if (name !== undefined) {
    const trimmed = name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    updates.name = trimmed;
  }

  if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber.trim();
  if (countryCode !== undefined) updates.countryCode = countryCode.trim();
  if (vatNumber !== undefined) updates.vatNumber = vatNumber.trim();
  if (companyName !== undefined) updates.companyName = companyName.trim();
  if (companyPosition !== undefined) updates.companyPosition = companyPosition.trim();

  if (address !== undefined) {
    updates.addressLine = formatAddress(address);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await db
    .update(userTable)
    .set(updates)
    .where(eq(userTable.id, session.user.id));

  return NextResponse.json({ success: true });
}
