import { timingSafeEqual } from "node:crypto";

export const DEMO_COOKIE = "cleandesk_demo";

export function demoPassword(): string {
  return process.env.DEMO_PASSWORD || "harbor-demo";
}

export function passwordMatches(input: string): boolean {
  const expected = demoPassword();
  const left = Buffer.from(input);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
