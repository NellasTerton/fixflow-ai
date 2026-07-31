"use server";

import { revalidatePath } from "next/cache";

import { bookingRequestSchema } from "@/lib/request/schema";
import {
  bookAvailabilitySlot,
  databaseBookingStore,
} from "@/server/requests/booking";

export interface BookingFormState {
  status: "idle" | "error" | "booked";
  message?: string;
  startsAt?: string;
}

export async function bookPublicSlot(
  _previousState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const parsed = bookingRequestSchema.safeParse({
    leadId: formData.get("leadId"),
    slotId: formData.get("slotId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Выберите доступное время",
    };
  }

  try {
    const result = await bookAvailabilitySlot(
      databaseBookingStore,
      parsed.data,
    );

    if (result.status === "unavailable") {
      return {
        status: "error",
        message:
          "Этот слот уже занят или недоступен. Обновите страницу и выберите другой.",
      };
    }

    revalidatePath("/workspace/leads");
    revalidatePath("/request/success");

    return {
      status: "booked",
      message: "Время успешно забронировано",
      startsAt: result.startsAt,
    };
  } catch {
    console.error("Public slot booking failed");
    return {
      status: "error",
      message: "Не удалось забронировать время. Попробуйте ещё раз.",
    };
  }
}
