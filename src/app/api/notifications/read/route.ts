import { NextResponse } from "next/server";
import { markNotificationRead } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/security";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const body = (await request.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "Укажите id уведомления" }, { status: 400 });
  }

  const ok = await markNotificationRead(body.id, session.userId);
  if (!ok) {
    return NextResponse.json({ error: "Уведомление не найдено" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
