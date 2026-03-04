import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const functionUrl = `${SUPABASE_URL}/functions/v1/notify-chat-message`;

Deno.test("returns 400 when missing required fields", async () => {
  const res = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ wedding_id: null, sender_id: null, content: null }),
  });
  const body = await res.json();
  assertEquals(res.status, 400);
  assertEquals(body.error, "Missing fields");
});

Deno.test("returns skipped when sender has no role", async () => {
  const fakeUuid = "00000000-0000-0000-0000-000000000000";
  const res = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      wedding_id: fakeUuid,
      sender_id: fakeUuid,
      content: "Test message",
      visibility: "all",
    }),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.skipped, true);
  assertEquals(body.reason, "no_role");
});

Deno.test("handles CORS preflight", async () => {
  const res = await fetch(functionUrl, { method: "OPTIONS" });
  await res.text();
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
});
