import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "costs.json");

// claude-sonnet-4-6 pricing
const INPUT_COST_PER_TOKEN = 3.0 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 15.0 / 1_000_000;

export interface CostData {
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  callCount: number;
}

async function readData(): Promise<CostData> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { totalCostUsd: 0, totalInputTokens: 0, totalOutputTokens: 0, callCount: 0 };
  }
}

async function writeData(data: CostData): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function recordUsage(inputTokens: number, outputTokens: number): Promise<number> {
  const data = await readData();
  const callCost = inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;
  data.totalInputTokens += inputTokens;
  data.totalOutputTokens += outputTokens;
  data.totalCostUsd += callCost;
  data.callCount += 1;
  await writeData(data);
  return callCost;
}

export async function getTotalCost(): Promise<CostData> {
  return readData();
}
