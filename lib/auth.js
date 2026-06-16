import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

export function generateAuthCode() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function checkAuth(code, requiredScope) {
  if (!code) return false;
  const raw = await redis.get(`authreq:${code}`);
  if (!raw) return false;
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  return data.status === "approved" && data.scope === requiredScope;
}

export async function createAccessRequest(scope) {
  const code = generateAuthCode();
  await redis.set(
    `authreq:${code}`,
    JSON.stringify({ scope, status: "pending", created: Date.now() }),
    { ex: 300 }
  );
  return code;
}

export async function getAccessRequest(code) {
  const raw = await redis.get(`authreq:${code}`);
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export async function approveAccessRequest(code) {
  const raw = await redis.get(`authreq:${code}`);
  if (!raw) return null;
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  data.status = "approved";
  data.approved_at = Date.now();
  await redis.set(`authreq:${code}`, JSON.stringify(data), { ex: 3600 });
  return data;
}
