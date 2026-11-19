import { NextResponse } from "next/server";
import {
  buildSessionCookieOptions,
  isHttpsRequest,
  SESSION_COOKIE_NAME,
} from "@/lib/security";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    "",
    buildSessionCookieOptions(isHttpsRequest(request), 0)
  );
  return response;
}
