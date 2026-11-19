import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/security";

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }
  if (session.role !== "staff") {
    return NextResponse.json(
      { error: "Только сотрудник деканата может публиковать объявления" },
      { status: 403 }
    );
  }

  const body = (await request.json()) as {
    targetGroup?: string;
    category?: "schedule" | "deadline" | "dean_news";
    urgent?: boolean;
    title?: string;
    body?: string;
  };

  const title = (body.title ?? "").trim();
  const text = (body.body ?? "").trim();
  if (title.length < 3 || text.length < 5) {
    return NextResponse.json(
      { error: "Заполните заголовок и текст объявления" },
      { status: 400 }
    );
  }

  const created = await createNotification({
    id: `not-${crypto.randomUUID().slice(0, 8)}`,
    targetStudentId: null,
    targetGroup: body.targetGroup && body.targetGroup !== "ALL" ? body.targetGroup : null,
    category: body.category ?? "dean_news",
    urgent: Boolean(body.urgent),
    title,
    titleEn: title,
    body: text,
    bodyEn: text,
    createdAt: new Date().toISOString(),
    readBy: [],
  });

  return NextResponse.json({ notification: created }, { status: 201 });
}
