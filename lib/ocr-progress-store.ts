const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const PROGRESS_TTL_SECONDS = 60 * 60 * 6;

function progressKey(jobId: string): string {
  return `ocr:progress:${jobId}`;
}

async function redisCommand<T>(command: unknown[]): Promise<T | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;

  const response = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Redis command failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { result?: T; error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload.result ?? null;
}

export async function getOcrProgress(jobId: string): Promise<number | null> {
  try {
    const value = await redisCommand<string | number | null>(["GET", progressKey(jobId)]);
    if (value === null || value === undefined) return null;

    const progress = Number(value);
    return Number.isFinite(progress) ? progress : null;
  } catch (error) {
    console.warn(`[OCR Progress] Redis read failed for job ${jobId}; falling back to DB progress`, error);
    return null;
  }
}

export async function setOcrProgress(jobId: string, completedPages: number): Promise<number | null> {
  try {
    const safeCompleted = Math.max(0, Math.floor(completedPages));
    const script = `
local current = tonumber(redis.call("GET", KEYS[1]) or "0")
local next = tonumber(ARGV[1])
if next > current then
  redis.call("SET", KEYS[1], next, "EX", ARGV[2])
  return next
end
redis.call("EXPIRE", KEYS[1], ARGV[2])
return current
`;

    const value = await redisCommand<number>([
      "EVAL",
      script,
      1,
      progressKey(jobId),
      safeCompleted,
      PROGRESS_TTL_SECONDS,
    ]);
    return typeof value === "number" ? value : null;
  } catch (error) {
    console.warn(`[OCR Progress] Redis write failed for job ${jobId}; continuing without live progress`, error);
    return null;
  }
}

export async function clearOcrProgress(jobId: string): Promise<void> {
  try {
    await redisCommand<number>(["DEL", progressKey(jobId)]);
  } catch (error) {
    console.warn(`[OCR Progress] Redis cleanup failed for job ${jobId}; key will expire by TTL`, error);
  }
}
