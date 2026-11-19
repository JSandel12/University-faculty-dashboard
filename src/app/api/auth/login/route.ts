import { NextResponse } from "next/server";
import { findUserByUsername, stripPassword } from "@/lib/db";
import {
  buildSessionCookieOptions,
  isHttpsRequest,
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifyPassword,
} from "@/lib/security";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Введите логин и пароль" },
        { status: 400 }
      );
    }

    const user = await findUserByUsername(username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    const token = signSessionToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      groupCode: user.profile?.groupCode,
    });

    const response = NextResponse.json({
      user: stripPassword(user),
    });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      buildSessionCookieOptions(isHttpsRequest(request))
    );

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Ошибка сервера при входе" },
      { status: 500 }
    );
  }
}
