import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  createNotification,
  getRequestById,
  updateRequestStatus,
} from "@/lib/db";
import { getSessionFromCookies } from "@/lib/security";
import type { RequestStatus } from "@/lib/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const { id } = await context.params;
  const req = await getRequestById(id);

  if (!req) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  // Strict server-side authorization: students cannot access another student's request
  if (session.role !== "staff" && req.studentId !== session.userId) {
    return NextResponse.json(
      {
        error: "Доступ запрещён: чужая заявка недоступна (403 Forbidden)",
        code: "IDOR_BLOCKED",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ request: req });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }
  if (session.role !== "staff") {
    return NextResponse.json(
      { error: "Только сотрудник деканата может изменять статус заявки" },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: RequestStatus;
    staffComment?: string;
  };

  const allowed: RequestStatus[] = ["submitted", "in_review", "ready", "rejected"];
  if (!body.status || !allowed.includes(body.status)) {
    return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
  }

  const updated = await updateRequestStatus(
    id,
    body.status,
    body.staffComment?.trim()
  );
  if (!updated) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  const statusLabels: Record<RequestStatus, { ru: string; en: string }> = {
    submitted: { ru: "Подана", en: "Submitted" },
    in_review: { ru: "В работе у специалиста", en: "In Review" },
    ready: { ru: "Готова к выдаче / PDF с QR", en: "Ready (PDF + QR)" },
    rejected: { ru: "Отклонена", en: "Rejected" },
  };

  await createNotification({
    id: `not-${crypto.randomUUID().slice(0, 8)}`,
    targetStudentId: updated.studentId,
    targetGroup: null,
    category: "request",
    urgent: updated.status === "ready" || updated.status === "rejected",
    title: `Статус заявки ${updated.verificationCode}: ${statusLabels[updated.status].ru}`,
    titleEn: `Request ${updated.verificationCode}: ${statusLabels[updated.status].en}`,
    body:
      updated.staffComment ||
      `Деканат обновил статус документа «${updated.title}».`,
    bodyEn:
      updated.staffComment ||
      `Dean's office updated "${updated.titleEn}" to ${statusLabels[updated.status].en}.`,
    createdAt: new Date().toISOString(),
    readBy: [],
  });

  return NextResponse.json({ request: updated });
}
