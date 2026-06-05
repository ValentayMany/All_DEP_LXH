import jwt from "@tsndr/cloudflare-worker-jwt";

function decodeJwtPayload(token) {
  const payload = token.split(".")[1];
  if (!payload) return null;

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function getUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token || !env.JWT_SECRET) return null;

  try {
    const ok = await jwt.verify(token, env.JWT_SECRET);
    if (!ok) return null;
    return decodeJwtPayload(token);
  } catch {
    return null;
  }
}

export function unauthorized() {
  return Response.json(
    { success: false, message: "Unauthorized" },
    { status: 401 },
  );
}

export function forbidden(message = "Forbidden") {
  return Response.json({ success: false, message }, { status: 403 });
}

