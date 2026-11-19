import { NextResponse } from "next/server";
import { findUserById, getStorageMode, stripPassword } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/security";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: stripPassword(user),
    storageMode: getStorageMode(),
  });
}
