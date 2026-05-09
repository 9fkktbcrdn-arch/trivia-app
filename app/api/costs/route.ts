import { NextResponse } from "next/server";
import { getTotalCost } from "@/lib/cost-tracker";

export async function GET() {
  const data = await getTotalCost();
  return NextResponse.json(data);
}
