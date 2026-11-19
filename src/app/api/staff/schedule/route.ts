import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createNotification, updateScheduleItem } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/security";
import type { ScheduleStatus } from "@/lib/types";

export async function PATCH(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }
  if (session.role !== "staff") {
    return NextResponse.json(
      { error: "Только сотрудник деканата может менять расписание" },
      { status: 403 }
    );
  }

  const body = (await request.json()) as {
    id?: string;
    status?: ScheduleStatus;
    room?: string;
    changeNote?: string;
  };

  const allowed: ScheduleStatus[] = [
    "normal",
    "room_changed",
    "teacher_replaced",
    "online",
    "cancelled",
  ];

  if (!body.id || !body.status || !allowed.includes(body.status) || !body.room?.trim()) {
    return NextResponse.json(
      { error: "Укажите id пары, статус и аудиторию" },
      { status: 400 }
    );
  }

  const note = body.changeNote?.trim() || undefined;
  const updated = await updateScheduleItem(body.id, {
    status: body.status,
    room: body.room.trim(),
    changeNote: note,
    changeNoteEn: note,
  });

  if (!updated) {
    return NextResponse.json({ error: "Пара не найдена" }, { status: 404 });
  }

  await createNotification({
    id: `not-${crypto.randomUUID().slice(0, 8)}`,
    targetStudentId: null,
    targetGroup: updated.groupCode,
    category: "schedule",
    urgent: updated.status !== "normal",
    title: `Обновление расписания (${updated.groupCode}): ${updated.subject}`,
    titleEn: `Schedule Update (${updated.groupCode}): ${updated.subjectEn}`,
    body: `${updated.startTime} · ${updated.room}${note ? ` — ${note}` : ""}`,
    bodyEn: `${updated.startTime} · ${updated.room}${note ? ` — ${note}` : ""}`,
    createdAt: new Date().toISOString(),
    readBy: [],
  });

  return NextResponse.json({ item: updated });
}
