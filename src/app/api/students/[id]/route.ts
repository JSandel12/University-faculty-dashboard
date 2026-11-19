import { NextResponse } from "next/server";
import { findUserById, stripPassword } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/security";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const { id } = await context.params;
  if (session.role !== "staff" && session.userId !== id) {
    return NextResponse.json(
      {
        error: "Доступ запрещён: чужой профиль студента изолирован на сервере (403 Forbidden)",
        code: "IDOR_BLOCKED",
      },
      { status: 403 }
    );
  }

  const user = await findUserById(id);
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  return NextResponse.json({ user: stripPassword(user) });
}
