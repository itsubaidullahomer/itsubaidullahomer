"use client";
import Cal from "@calcom/embed-react";
export default function Booking() {
  return (
    <Cal
      calLink={process.env.NEXT_PUBLIC_CAL_LINK!}
      config={{ theme: "light", layout: "month_view" }}
      style={{ width: "100%", height: "min(620px, 70vh)", overflow: "auto" }}
    />
  );
}
