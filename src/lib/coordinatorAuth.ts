import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Staff } from "@/types/scheduling";

export type CoordinatorStaff = Staff & { id: string };

export async function getCoordinatorStaffByEmail(email: string) {
  if (!email || !db) {
    return null;
  }

  const staffQuery = query(
    collection(db, "staff"),
    where("email", "==", email),
    limit(1)
  );
  const snapshot = await getDocs(staffQuery);

  if (snapshot.empty) {
    return null;
  }

  const staffDocument = snapshot.docs[0];
  const staff = staffDocument.data() as Staff;

  if (staff.role !== "coordinator" || !staff.isActive) {
    return null;
  }

  return {
    ...staff,
    id: staffDocument.id,
  } satisfies CoordinatorStaff;
}