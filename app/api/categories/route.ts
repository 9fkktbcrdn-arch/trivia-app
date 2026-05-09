import { NextRequest, NextResponse } from "next/server";
import {
  getCategories,
  recordCategoryPlayed,
  removeRecentCategory,
  addCustomCategory,
} from "@/lib/storage";

export async function GET() {
  const store = await getCategories();
  return NextResponse.json(store);
}

export async function POST(req: NextRequest) {
  const { action, name } = await req.json();

  switch (action) {
    case "record":
      await recordCategoryPlayed(name);
      break;
    case "remove":
      await removeRecentCategory(name);
      break;
    case "addCustom":
      await addCustomCategory(name);
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const store = await getCategories();
  return NextResponse.json(store);
}
