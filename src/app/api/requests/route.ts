import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  createNotification,
  createRequest,
  findUserById,
  getAllRequests,
  getRequestsForStudent,
} from "@/lib/db";
import { getSessionFromCookies } from "@/lib/security";
import type { CertificateRequest, RequestTypeCode } from "@/lib/types";

const REQUEST_CATALOG: Record<
  RequestTypeCode,
  { title: string; titleEn: string }
> = {
  study_cert: {
    title: "Справка об обучении (с ЭЦП и QR)",
    titleEn: "Enrollment Verification Certificate (Digital QR)",
  },
  visa_cert: {
    title: "Справка для консульства / визового центра",
    titleEn: "Consulate / Visa Support Certificate",
  },
  military_cert: {
    title: "Справка-подтверждение (форма для военкомата)",
    titleEn: "Military Registration Enrollment Form",
  },
  retake_permit: {
    title: "Направление на пересдачу (электронный допуск)",
    titleEn: "Exam Retake Permit",
  },
  transcript: {
    title: "Выписка оценок (академическая справка)",
    titleEn: "Official Academic Transcript",
  },
  custom_appeal: {
    title: "Обращение в деканат / индивидуальный запрос",
    titleEn: "Dean's Office Appeal / Custom Inquiry",
  },
};

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const requests =
    session.role === "staff"
      ? await getAllRequests()
      : await getRequestsForStudent(session.userId);

  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }
  if (session.role !== "student") {
    return NextResponse.json(
      { error: "Подача заявок доступна только из профиля студента" },
      { status: 403 }
    );
  }

  const user = await findUserById(session.userId);
  if (!user || !user.profile) {
    return NextResponse.json({ error: "Профиль не найден" }, { status: 404 });
  }

  const body = (await request.json()) as {
    typeCode?: RequestTypeCode;
    purpose?: string;
    deliveryFormat?: "digital_pdf" | "paper_pickup";
  };

  const typeCode = body.typeCode;
  if (!typeCode || !(typeCode in REQUEST_CATALOG)) {
    return NextResponse.json(
      { error: "Выберите корректный тип заявки" },
      { status: 400 }
    );
  }

  const purpose = (body.purpose ?? "").trim();
  if (purpose.length < 3 || purpose.length > 300) {
    return NextResponse.json(
      { error: "Укажите цель или комментарий (от 3 до 300 символов)" },
      { status: 400 }
    );
  }

  const deliveryFormat =
    body.deliveryFormat === "paper_pickup" ? "paper_pickup" : "digital_pdf";

  const now = new Date().toISOString();
  const shortHex = crypto.randomBytes(2).toString("hex").toUpperCase();
  const groupClean = user.profile.groupCode.replace(/[^A-ZА-Я0-9]/gi, "");
  const verificationCode = `DEC-2026-${groupClean}-${shortHex}`;

  const catalog = REQUEST_CATALOG[typeCode];
  const newReq: CertificateRequest = {
    id: `req-${crypto.randomUUID().slice(0, 8)}`,
    studentId: user.id,
    studentName: user.fullName,
    groupCode: user.profile.groupCode,
    typeCode,
    title: catalog.title,
    titleEn: catalog.titleEn,
    purpose,
    deliveryFormat,
    status: "submitted",
    verificationCode,
    createdAt: now,
    updatedAt: now,
  };

  const created = await createRequest(newReq);

  await createNotification({
    id: `not-${crypto.randomUUID().slice(0, 8)}`,
    targetStudentId: user.id,
    targetGroup: null,
    category: "request",
    urgent: false,
    title: `Заявка ${verificationCode} принята в обработку`,
    titleEn: `Request ${verificationCode} Submitted`,
    body: `Документ «${catalog.title}» зарегистрирован. Статус обновляется в реальном времени.`,
    bodyEn: `Your request "${catalog.titleEn}" has been registered and routed to the dean's office queue.`,
    createdAt: now,
    readBy: [],
  });

  return NextResponse.json({ request: created }, { status: 201 });
}
