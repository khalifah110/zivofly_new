import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GOOGLE_CLIENT_ID = Deno.env.get("google_client_id")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("google_client_secret")!;
const GOOGLE_REDIRECT_URL = Deno.env.get("google_redirect_url")!;
const GOOGLE_APP_URL = Deno.env.get("google_url")!;
const GOOGLE_ENCRYPTION_KEY = Deno.env.get("google_token_encryption_key")!;

const missingGoogleConfiguration = [
  ["google_client_id", GOOGLE_CLIENT_ID],
  ["google_client_secret", GOOGLE_CLIENT_SECRET],
  ["google_redirect_url", GOOGLE_REDIRECT_URL],
  ["google_url", GOOGLE_APP_URL],
  ["google_token_encryption_key", GOOGLE_ENCRYPTION_KEY],
].filter(([, value]) => !value).map(([name]) => name);

if (missingGoogleConfiguration.length > 0) {
  console.error("GOOGLE_WORKSPACE_MISSING_CONFIGURATION", {
    missing: missingGoogleConfiguration,
  });
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": GOOGLE_APP_URL,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Content-Type": "application/json",
};

const SERVICES: Record<
  string,
  { provider: string; name: string; scopes: string[] }
> = {
  gmail: {
    provider: "gmail",
    name: "Gmail",
    scopes: ["https://www.googleapis.com/auth/gmail.modify"],
  },
  google_drive: {
    provider: "google_drive",
    name: "Google Drive",
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  },
  google_docs: {
    provider: "google_docs",
    name: "Google Docs",
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  },
  google_sheets_service: {
    provider: "google_sheets_service",
    name: "Google Sheets",
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  },
  google_calendar: {
    provider: "google_calendar",
    name: "Google Calendar",
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
  },
};

const IDENTITY_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });
}

function redirectToApp(params: Record<string, string>) {
  const url = new URL(GOOGLE_APP_URL);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return Response.redirect(url.toString(), 302);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function randomState(): string {
  return base64UrlEncode(
    crypto.getRandomValues(new Uint8Array(32)),
  );
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );

  return base64UrlEncode(new Uint8Array(digest));
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const rawKey = Uint8Array.from(
    atob(GOOGLE_ENCRYPTION_KEY),
    (char) => char.charCodeAt(0),
  );

  if (rawKey.length !== 32) {
    throw new Error("Encryption key must decode to exactly 32 bytes.");
  }

  return await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptToken(value: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value),
  );

  return `v1:${base64UrlEncode(iv)}:${base64UrlEncode(
    new Uint8Array(encrypted),
  )}`;
}

// Used by the token refresh and Google API operations added later.
async function decryptToken(value: string): Promise<string> {
  const parts = value.split(":");

  if (parts.length !== 3 || parts[0] !== "v1") {
    throw new Error("Unsupported encrypted token format.");
  }

  const key = await getEncryptionKey();
  const iv = base64UrlDecode(parts[1]);
  const ciphertext = base64UrlDecode(parts[2]);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}

async function verifyWorkspacePermission(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .select("id, owner_user_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (workspaceError || !workspace) return false;

  if (workspace.owner_user_id === userId) return true;

  const { data: membership, error: membershipError } = await admin
    .from("workspace_members")
    .select("member_role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError || !membership) return false;

  const role = String(membership.member_role || "").toLowerCase();

  return [
    "owner",
    "admin",
    "workspace_owner",
    "workspace_admin",
  ].includes(role);
}

async function startOAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Authentication required." }, 401);
  }

  const userClient = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: { Authorization: authHeader },
      },
    },
  );

  const { data: userData, error: userError } =
    await userClient.auth.getUser();

  if (userError || !userData.user) {
    return json({ error: "Invalid or expired login session." }, 401);
  }

  const body = await req.json();
  const workspaceId = body.workspace_id;
  const serviceKey = body.service;

  if (
    typeof workspaceId !== "string" ||
    typeof serviceKey !== "string" ||
    !SERVICES[serviceKey]
  ) {
    return json({
      error: "Provide a valid workspace_id and service.",
      supported_services: Object.keys(SERVICES),
    }, 400);
  }

  const permitted = await verifyWorkspacePermission(
    userData.user.id,
    workspaceId,
  );

  if (!permitted) {
    return json({
      error: "Only the workspace owner or administrator can connect integrations.",
    }, 403);
  }

  const service = SERVICES[serviceKey];

  const { data: provider, error: providerError } = await admin
    .from("integration_providers")
    .select("provider_key, is_enabled")
    .eq("provider_key", service.provider)
    .maybeSingle();

  if (
    providerError ||
    !provider ||
    provider.is_enabled !== true
  ) {
    return json({
      error: `${service.name} provider is missing or disabled.`,
    }, 400);
  }

  const state = randomState();
  const stateHash = await sha256(state);

  const { error: stateError } = await admin
    .from("google_oauth_states")
    .insert({
      state_hash: stateHash,
      workspace_id: workspaceId,
      initiated_by: userData.user.id,
      service_key: serviceKey,
      redirect_to: GOOGLE_APP_URL,
      expires_at: new Date(
        Date.now() + 10 * 60 * 1000,
      ).toISOString(),
    });

  if (stateError) {
    console.error("OAuth state creation failed:", stateError);

    return json({
      error: "Could not start Google authorization.",
    }, 500);
  }

  const scopes = [
    ...IDENTITY_SCOPES,
    ...service.scopes,
  ];

  const googleUrl = new URL(
    "https://accounts.google.com/o/oauth2/v2/auth",
  );

  googleUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  googleUrl.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URL);
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", scopes.join(" "));
  googleUrl.searchParams.set("state", state);
  googleUrl.searchParams.set("access_type", "offline");
  googleUrl.searchParams.set("include_granted_scopes", "true");
  googleUrl.searchParams.set("prompt", "consent select_account");

  return json({
    authorization_url: googleUrl.toString(),
  });
}

async function consumeOAuthState(state: string) {
  const stateHash = await sha256(state);
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("google_oauth_states")
    .update({ used_at: now })
    .eq("state_hash", stateHash)
    .is("used_at", null)
    .gt("expires_at", now)
    .select(
      "workspace_id, initiated_by, redirect_to, service_key",
    )
    .maybeSingle();

  if (error || !data) return null;

  return {
    workspaceId: data.workspace_id,
    userId: data.initiated_by,
    serviceKey: data.service_key,
  };
}

function diagnosticError(error: unknown) {
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    return {
      name: typeof value.name === "string" ? value.name : "Error",
      message: typeof value.message === "string" ? value.message : String(error),
      code: typeof value.code === "string" ? value.code : undefined,
      details: typeof value.details === "string" ? value.details : undefined,
      hint: typeof value.hint === "string" ? value.hint : undefined,
    };
  }
  return { message: String(error) };
}

async function handleGoogleCallback(req: Request) {
  const url = new URL(req.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const googleError = url.searchParams.get("error");

  if (!state) {
    return redirectToApp({
      google_oauth: "error",
      reason: "missing_state",
    });
  }

  const stateData = await consumeOAuthState(state);

  if (!stateData) {
    return redirectToApp({
      google_oauth: "error",
      reason: "invalid_or_expired_state",
    });
  }

  if (googleError) {
    return redirectToApp({
      google_oauth: "error",
      reason: "google_authorization_denied",
    });
  }

  if (!code) {
    return redirectToApp({
      google_oauth: "error",
      reason: "missing_authorization_code",
    });
  }

  let stage = "callback_started";

  try {
    stage = "service_validation";
    console.log("GOOGLE_OAUTH_STAGE", { stage, service: stateData.serviceKey });
    const service = SERVICES[stateData.serviceKey];

    if (!service) {
      throw new Error("Invalid Google service in OAuth state.");
    }

    // Exchange the one-time authorization code for Google tokens.
    // Never log the authorization code, client secret, access token, or refresh token.
    stage = "google_token_exchange";
    console.log("GOOGLE_OAUTH_STAGE", { stage });
    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URL,
          grant_type: "authorization_code",
        }),
      },
    );

    const tokenResponseText = await tokenResponse.text();
    let tokens: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    try {
      tokens = JSON.parse(tokenResponseText);
    } catch {
      console.error("GOOGLE_TOKEN_EXCHANGE_NON_JSON_RESPONSE", {
        http_status: tokenResponse.status,
        response_is_json: false,
        client_id_configured: Boolean(GOOGLE_CLIENT_ID),
        client_secret_configured: Boolean(GOOGLE_CLIENT_SECRET),
        redirect_url_configured: Boolean(GOOGLE_REDIRECT_URL),
      });

      return redirectToApp({
        google_oauth: "error",
        reason: "token_exchange_invalid_response",
      });
    }

    if (
      !tokenResponse.ok ||
      typeof tokens.access_token !== "string" ||
      !tokens.access_token
    ) {
      console.error("GOOGLE_TOKEN_EXCHANGE_FAILED", {
        http_status: tokenResponse.status,
        error: tokens.error || "unknown_error",
        error_description:
          tokens.error_description || "Google did not provide an error description.",
        client_id_configured: Boolean(GOOGLE_CLIENT_ID),
        client_secret_configured: Boolean(GOOGLE_CLIENT_SECRET),
        redirect_url_configured: Boolean(GOOGLE_REDIRECT_URL),
        authorization_code_received: Boolean(code),
      });

      return redirectToApp({
        google_oauth: "error",
        reason: "token_exchange_failed",
      });
    }

    console.log("GOOGLE_TOKEN_EXCHANGE_SUCCEEDED", {
      token_type: typeof tokens.token_type === "string"
        ? tokens.token_type
        : "not_returned",
      expires_in_present: typeof tokens.expires_in === "number",
      refresh_token_returned: typeof tokens.refresh_token === "string",
      scope_returned: typeof tokens.scope === "string",
    });

    stage = "google_userinfo_request";
    console.log("GOOGLE_OAUTH_STAGE", { stage });
    const userInfoResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      },
    );

    const userInfo = await userInfoResponse.json();
    console.log("GOOGLE_USERINFO_RESPONSE", {
      http_status: userInfoResponse.status,
      ok: userInfoResponse.ok,
      subject_present: Boolean(userInfo?.sub),
      email_present: Boolean(userInfo?.email),
    });

    if (
      !userInfoResponse.ok ||
      !userInfo.sub ||
      !userInfo.email
    ) {
      throw new Error("Google account verification failed.");
    }

    stage = "workspace_permission_check";
    console.log("GOOGLE_OAUTH_STAGE", { stage });
    const permitted = await verifyWorkspacePermission(
      stateData.userId,
      stateData.workspaceId,
    );

    if (!permitted) {
      throw new Error("Workspace permission was revoked.");
    }

    stage = "existing_connection_lookup";
    console.log("GOOGLE_OAUTH_STAGE", { stage });
    const { data: existingConnection, error: existingError } =
      await admin
        .from("integration_connections")
        .select("id")
        .eq("workspace_id", stateData.workspaceId)
        .eq("provider_key", service.provider)
        .eq("external_account_id", userInfo.sub)
        .maybeSingle();

    if (existingError) {
      throw new Error("Could not check existing integration.");
    }

    let existingRefreshToken: string | null = null;

    if (existingConnection?.id && !tokens.refresh_token) {
      const { data: existingTokens, error: existingTokenError } =
        await admin
          .from("google_connection_tokens")
          .select("encrypted_refresh_token")
          .eq("connection_id", existingConnection.id)
          .maybeSingle();

      if (existingTokenError) {
        throw new Error("Could not retrieve existing token record.");
      }

      existingRefreshToken =
        existingTokens?.encrypted_refresh_token || null;
    }

    stage = "token_encryption";
    console.log("GOOGLE_OAUTH_STAGE", { stage });
    const encryptedAccessToken = await encryptToken(
      tokens.access_token,
    );

    const encryptedRefreshToken = tokens.refresh_token
      ? await encryptToken(tokens.refresh_token)
      : existingRefreshToken;

    const grantedScopes = typeof tokens.scope === "string"
      ? tokens.scope.split(" ").filter(Boolean)
      : [...IDENTITY_SCOPES, ...service.scopes];

    stage = "integration_connection_upsert";
    console.log("GOOGLE_OAUTH_STAGE", { stage });
    const connectionPayload = {
      workspace_id: stateData.workspaceId,
      provider_key: service.provider,
      display_name: `${service.name} — ${userInfo.email}`,
      external_account_id: userInfo.sub,
      external_account_name: userInfo.email,
      status: "connected",
      scopes: grantedScopes,
      last_error: null,
      metadata: {
        google_email: userInfo.email,
        google_name: userInfo.name || null,
        picture: userInfo.picture || null,
      },
      connected_by: stateData.userId,
      updated_at: new Date().toISOString(),
    };

    const { data: connection, error: connectionError } =
      await admin
        .from("integration_connections")
        .upsert(connectionPayload, {
          onConflict:
            "workspace_id,provider_key,external_account_id",
        })
        .select("id")
        .single();

    if (connectionError || !connection) {
      console.error("GOOGLE_CONNECTION_SAVE_FAILED", {
        ...diagnosticError(connectionError),
      });

      throw new Error("Could not save Google integration.");
    }

    stage = "google_token_record_upsert";
    console.log("GOOGLE_OAUTH_STAGE", { stage, connection_id_present: Boolean(connection.id) });
    const expiresAt = new Date(
      Date.now() + Number(tokens.expires_in || 3600) * 1000,
    ).toISOString();

    const { error: tokenError } = await admin
      .from("google_connection_tokens")
      .upsert({
        connection_id: connection.id,
        workspace_id: stateData.workspaceId,
        encrypted_access_token: encryptedAccessToken,
        encrypted_refresh_token: encryptedRefreshToken,
        token_type: tokens.token_type || "Bearer",
        token_expires_at: expiresAt,
        granted_scopes: grantedScopes,
        encryption_version: 1,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "connection_id",
      });

    if (tokenError) {
      console.error("GOOGLE_TOKEN_STORAGE_FAILED", {
        ...diagnosticError(tokenError),
      });

      // Avoid leaving a connection marked successful without its tokens.
      await admin
        .from("integration_connections")
        .update({
          status: "error",
          last_error: "Secure token storage failed.",
        })
        .eq("id", connection.id);

      throw new Error("Could not securely save Google authorization.");
    }

    console.log("GOOGLE_OAUTH_COMPLETED", {
      service: stateData.serviceKey,
      connection_id: connection.id,
      refresh_token_saved: Boolean(encryptedRefreshToken),
    });

    return redirectToApp({
      google_oauth: "success",
      service: stateData.serviceKey,
      email: userInfo.email,
      connection_id: connection.id,
    });
  } catch (error) {
    console.error("GOOGLE_OAUTH_CALLBACK_FAILED", {
      stage,
      service: stateData.serviceKey,
      workspace_id: stateData.workspaceId,
      error: diagnosticError(error),
    });

    return redirectToApp({
      google_oauth: "error",
      reason: "connection_processing_failed",
      google_stage: stage,
    });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method === "GET") {
      return await handleGoogleCallback(req);
    }

    if (req.method === "POST") {
      const body = await req.clone().json();

      if (body.action === "start") {
        return await startOAuth(req);
      }

      return json({
        error: "Unsupported action.",
        supported_actions: ["start"],
      }, 400);
    }

    return json({
      error: "Method not allowed.",
    }, 405);
  } catch (error) {
    console.error("Google Workspace function error:", error);

    return json({
      error: "An unexpected server error occurred.",
    }, 500);
  }
});
