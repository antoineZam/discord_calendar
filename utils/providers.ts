/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "../settings";
import { EventSource } from "../types";
import { MINUTE_MS } from "./date";

/** External calendars, connected through OAuth. */
export type Provider = Exclude<EventSource, "discord">;

interface ProviderConfig {
    authUrl: string;
    tokenUrl: string;
    scope: string;
    redirectUri: string;
    clientId: () => string;
    /** Setting holding the refresh token once connected. */
    tokenKey: "googleRefreshToken" | "outlookRefreshToken";
    /** Extra parameters for the authorization page. */
    authParams?: Record<string, string>;
    /** Extra parameters for every token request. */
    tokenParams?: Record<string, string>;
}

const GOOGLE_CLIENT_ID = "634850353269-g82ekhtmoilfpdjbcvedpb0i8ntc7d3c.apps.googleusercontent.com";
const OUTLOOK_SCOPE = "Calendars.Read offline_access";

export const PROVIDERS: Record<Provider, ProviderConfig> = {
    google: {
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scope: "https://www.googleapis.com/auth/calendar.readonly",
        redirectUri: "https://antoinezam.github.io/discord_calendar",
        clientId: () => GOOGLE_CLIENT_ID,
        tokenKey: "googleRefreshToken",
        authParams: { access_type: "offline", prompt: "consent" },
    },
    outlook: {
        authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        scope: OUTLOOK_SCOPE,
        redirectUri: "https://login.microsoftonline.com/common/oauth2/nativeclient",
        clientId: () => settings.store.outlookClientId,
        tokenKey: "outlookRefreshToken",
        tokenParams: { scope: OUTLOOK_SCOPE },
    },
};

interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
}

async function requestToken(provider: Provider, params: Record<string, string>): Promise<TokenResponse> {
    const { tokenUrl, clientId, tokenParams } = PROVIDERS[provider];
    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: clientId(), ...tokenParams, ...params }),
    });

    if (!response.ok) throw new Error(`Token request failed (${response.status}): ${await response.text()}`);
    return response.json();
}

/** Builds the PKCE pair for one authorization attempt. */
export async function createPkce() {
    const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return { verifier, challenge: base64Url(new Uint8Array(digest)) };
}

function base64Url(bytes: Uint8Array) {
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function authorizationUrl(provider: Provider, codeChallenge: string) {
    const { authUrl, clientId, redirectUri, scope, authParams } = PROVIDERS[provider];
    const params = new URLSearchParams({
        client_id: clientId(),
        redirect_uri: redirectUri,
        response_type: "code",
        scope,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        ...authParams,
    });
    return `${authUrl}?${params}`;
}

/** Trades the code pasted by the user for a refresh token. */
export async function exchangeCode(provider: Provider, code: string, codeVerifier: string) {
    const tokens = await requestToken(provider, {
        grant_type: "authorization_code",
        code,
        code_verifier: codeVerifier,
        redirect_uri: PROVIDERS[provider].redirectUri,
    });

    if (!tokens.refresh_token) throw new Error("No refresh token received. Make sure you granted offline access.");
    return tokens.refresh_token;
}

const accessTokens = new Map<Provider, { refreshToken: string; value: string; expiresAt: number; }>();

/** Returns a valid access token, or null when the provider is not connected. */
export async function getAccessToken(provider: Provider) {
    const refreshToken = settings.store[PROVIDERS[provider].tokenKey];
    if (!refreshToken) return null;

    // Keyed on the refresh token so that reconnecting another account never reuses the previous token
    const cached = accessTokens.get(provider);
    if (cached?.refreshToken === refreshToken && Date.now() < cached.expiresAt) return cached.value;

    const { access_token, expires_in } = await requestToken(provider, { grant_type: "refresh_token", refresh_token: refreshToken });
    accessTokens.set(provider, { refreshToken, value: access_token, expiresAt: Date.now() + expires_in * 1000 - MINUTE_MS });
    return access_token;
}
