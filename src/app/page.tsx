import React from "react";
import { DecanatApp } from "@/components/DecanatApp";
import type { PortalData } from "@/components/PortalWorkspace";
import {
  findUserById,
  getAllRequests,
  getAllSchedule,
  getBookedAppointmentSlots,
  getGradesForStudent,
  getNotificationsForUser,
  getRequestsForStudent,
  getScheduleForGroup,
  getStorageMode,
  listStudentsPublic,
  stripPassword,
} from "@/lib/db";
import { getSessionFromCookies } from "@/lib/security";

export const dynamic = "force-dynamic";

async function loadInitialPortalData(): Promise<PortalData | null> {
  const session = await getSessionFromCookies();
  if (!session) return null;

  const user = await findUserById(session.userId);
  if (!user) return null;

  if (user.role === "staff") {
    const [schedule, requests, notifications, students, bookedSlots] = await Promise.all([
      getAllSchedule(),
      getAllRequests(),
      getNotificationsForUser(user.id, "staff"),
      listStudentsPublic(),
      getBookedAppointmentSlots(),
    ]);
    return {
      user: stripPassword(user),
      storageMode: getStorageMode(),
      schedule,
      grades: [],
      requests,
      bookedSlots,
      notifications,
      students,
    };
  }

  const groupCode = user.profile?.groupCode ?? "";
  const [schedule, grades, requests, notifications, bookedSlots] = await Promise.all([
    getScheduleForGroup(groupCode),
    getGradesForStudent(user.id),
    getRequestsForStudent(user.id),
    getNotificationsForUser(user.id, "student", groupCode),
    getBookedAppointmentSlots(),
  ]);

  return {
    user: stripPassword(user),
    storageMode: getStorageMode(),
    schedule,
    grades,
    requests,
    bookedSlots,
    notifications,
    students: [],
  };
}

export default async function HomePage() {
  const initialPortalData = await loadInitialPortalData();
  return <DecanatApp initialPortalData={initialPortalData} />;
}
