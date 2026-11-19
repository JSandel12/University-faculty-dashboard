import { NextResponse } from "next/server";
import {
  findUserById,
  getAllRequests,
  getAllSchedule,
  getGradesForStudent,
  getNotificationsForUser,
  getRequestsForStudent,
  getScheduleForGroup,
  getStorageMode,
  listStudentsPublic,
  stripPassword,
} from "@/lib/db";
import { getSessionFromCookies } from "@/lib/security";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "Сессия недействительна" }, { status: 401 });
  }

  if (user.role === "staff") {
    const [schedule, requests, notifications, students] = await Promise.all([
      getAllSchedule(),
      getAllRequests(),
      getNotificationsForUser(user.id, "staff"),
      listStudentsPublic(),
    ]);

    return NextResponse.json({
      user: stripPassword(user),
      storageMode: getStorageMode(),
      schedule,
      grades: [],
      requests,
      notifications,
      students,
    });
  }

  const groupCode = user.profile?.groupCode ?? "";
  const [schedule, grades, requests, notifications] = await Promise.all([
    getScheduleForGroup(groupCode),
    getGradesForStudent(user.id),
    getRequestsForStudent(user.id),
    getNotificationsForUser(user.id, "student", groupCode),
  ]);

  return NextResponse.json({
    user: stripPassword(user),
    storageMode: getStorageMode(),
    schedule,
    grades,
    requests,
    notifications,
    students: [],
  });
}
