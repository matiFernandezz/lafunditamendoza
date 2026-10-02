import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReservationView from "@/components/store/ReservationView";
import { isUuid } from "@/lib/catalog";
import { getPublicReservation } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu reserva · La Fundita",
  // El link es personal (lleva el token de la reserva).
  robots: { index: false, follow: false },
};

export default async function ReservaPage(props: PageProps<"/reserva/[token]">) {
  const { token } = await props.params;
  if (!isUuid(token)) notFound();

  const reservation = await getPublicReservation(token);
  if (!reservation) notFound();

  return <ReservationView reservation={reservation} />;
}
