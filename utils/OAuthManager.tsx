/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Forms, React, TextInput, useState } from "@webpack/common";

import { CheckIcon, SourceIcon } from "../components/Icons";
import { settings } from "../settings";

// Use VencordNative for opening external URLs
declare const VencordNative: {
    native: {
        openExternal: (url: string) => void;
    };
};

// Hardcoded OAuth Client IDs - no user configuration needed
export const GOOGLE_CLIENT_ID = "634850353269-g82ekhtmoilfpdjbcvedpb0i8ntc7d3c.apps.googleusercontent.com";
export const GOOGLE_REDIRECT_URI = "https://antoinezam.github.io/discord_calendar";

export class OAuthManager {
    // Google OAuth - Opens modal for user to paste auth code
    async authenticateGoogle(): Promise<void> {
        return new Promise((resolve, reject) => {
            openModal(props => (
                <OAuthModal
                    {...props}
                    provider="google"
                    clientId={GOOGLE_CLIENT_ID}
                    onSuccess={refreshToken => {
                        settings.store.googleRefreshToken = refreshToken;
                        showNotification({
                            title: "CalendarSync",
                            body: "Successfully connected to Google Calendar!",
                            color: "#34A853",
                        });
                        resolve();
                    }}
                    onError={reject}
                />
            ));
        });
    }

    // Outlook OAuth - Opens modal for user to paste auth code
    async authenticateOutlook(): Promise<void> {
        const clientId = settings.store.outlookClientId;
        if (!clientId) {
            throw new Error("Outlook Client ID not configured");
        }

        return new Promise((resolve, reject) => {
            openModal(props => (
                <OAuthModal
                    {...props}
                    provider="outlook"
                    clientId={clientId}
                    onSuccess={refreshToken => {
                        settings.store.outlookRefreshToken = refreshToken;
                        showNotification({
                            title: "CalendarSync",
                            body: "Successfully connected to Outlook Calendar!",
                            color: "#0078D4",
                        });
                        resolve();
                    }}
                    onError={reject}
                />
            ));
        });
    }
}

export const oauthManager = new OAuthManager();

// OAuth Modal Component
interface OAuthModalProps extends ModalProps {
    provider: "google" | "outlook";
    clientId: string;
    onSuccess: (refreshToken: string) => void;
    onError: (error: Error) => void;
}

function OAuthModal({ transitionState, onClose, provider, clientId, onSuccess, onError }: OAuthModalProps) {
    const [step, setStep] = useState<"initial" | "code" | "loading" | "success" | "error">("initial");
    const [authCode, setAuthCode] = useState("");
    const [error, setError] = useState("");
    const [codeVerifier] = useState(() => generateCodeVerifier());
    const [codeChallenge, setCodeChallenge] = useState("");

    // Generate code challenge on mount
    React.useEffect(() => {
        generateCodeChallenge(codeVerifier).then(setCodeChallenge);
    }, [codeVerifier]);

    const providerConfig = {
        google: {
            name: "Google Calendar",
            color: "#4285F4",
            authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl: "https://oauth2.googleapis.com/token",
            scope: "https://www.googleapis.com/auth/calendar.readonly",
            redirectUri: GOOGLE_REDIRECT_URI,
        },
        outlook: {
            name: "Outlook Calendar",
            color: "#0078D4",
            authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            scope: "Calendars.Read offline_access",
            redirectUri: "https://login.microsoftonline.com/common/oauth2/nativeclient",
        },
    };

    const config = providerConfig[provider];

    function openAuthUrl() {
        const url = new URL(config.authUrl);
        url.searchParams.set("client_id", clientId);
        url.searchParams.set("redirect_uri", config.redirectUri);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("scope", config.scope);
        url.searchParams.set("code_challenge", codeChallenge);
        url.searchParams.set("code_challenge_method", "S256");

        if (provider === "google") {
            url.searchParams.set("access_type", "offline");
            url.searchParams.set("prompt", "consent");
        }

        VencordNative.native.openExternal(url.toString());
        setStep("code");
    }

    async function submitCode() {
        if (!authCode.trim()) {
            setError("Please enter the authorization code");
            return;
        }

        setStep("loading");
        setError("");

        try {
            const bodyParams: Record<string, string> = {
                client_id: clientId,
                code: authCode.trim(),
                code_verifier: codeVerifier,
                grant_type: "authorization_code",
                redirect_uri: config.redirectUri,
            };

            if (provider === "outlook") {
                bodyParams.scope = config.scope;
            }

            const response = await fetch(config.tokenUrl, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(bodyParams),
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Token exchange failed: ${errorData}`);
            }

            const tokens = await response.json();

            if (!tokens.refresh_token) {
                throw new Error("No refresh token received. Make sure you granted offline access.");
            }

            setStep("success");
            onSuccess(tokens.refresh_token);

            setTimeout(() => onClose(), 1500);
        } catch (err) {
            setStep("error");
            setError(err instanceof Error ? err.message : "Unknown error occurred");
            onError(err instanceof Error ? err : new Error("Unknown error"));
        }
    }

    return (
        <ModalRoot transitionState={transitionState} size={ModalSize.SMALL}>
            <ModalHeader>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <SourceIcon source={provider} size={24} />
                    <span style={{ fontSize: "16px", fontWeight: 600 }}>
                        Connect {config.name}
                    </span>
                </div>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent style={{ padding: "16px" }}>
                {step === "initial" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <Forms.FormText>
                            Click the button below to open the {config.name} authorization page in your browser.
                            After granting access, copy the authorization code and paste it here.
                        </Forms.FormText>
                        <Button
                            color={Button.Colors.BRAND}
                            onClick={openAuthUrl}
                            disabled={!codeChallenge}
                        >
                            Open {config.name} Authorization
                        </Button>
                    </div>
                )}

                {step === "code" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <Forms.FormText>
                            After authorizing, you'll see an authorization code.
                            Copy and paste that code below:
                        </Forms.FormText>
                        <TextInput
                            placeholder="Paste authorization code here..."
                            value={authCode}
                            onChange={setAuthCode}
                        />
                        {error && (
                            <Forms.FormText style={{ color: "var(--text-danger)" }}>
                                {error}
                            </Forms.FormText>
                        )}
                        <div style={{ display: "flex", gap: "8px" }}>
                            <Button
                                color={Button.Colors.PRIMARY}
                                onClick={() => setStep("initial")}
                            >
                                Back
                            </Button>
                            <Button
                                color={Button.Colors.BRAND}
                                onClick={submitCode}
                            >
                                Connect
                            </Button>
                        </div>
                    </div>
                )}

                {step === "loading" && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "24px" }}>
                        <div style={{
                            width: "32px",
                            height: "32px",
                            border: "3px solid var(--background-modifier-accent)",
                            borderTopColor: config.color,
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite"
                        }} />
                        <Forms.FormText>Connecting...</Forms.FormText>
                        <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
                    </div>
                )}

                {step === "success" && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "24px" }}>
                        <div style={{
                            width: "48px",
                            height: "48px",
                            background: "#43b581",
                            color: "white",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            <CheckIcon size={24} />
                        </div>
                        <Forms.FormText style={{ fontSize: "16px", fontWeight: 500 }}>
                            Connected Successfully!
                        </Forms.FormText>
                    </div>
                )}

                {step === "error" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{
                            background: "rgba(237, 66, 69, 0.1)",
                            padding: "12px",
                            borderRadius: "8px"
                        }}>
                            <Forms.FormText style={{ color: "var(--text-danger)" }}>
                                {error}
                            </Forms.FormText>
                        </div>
                        <Button
                            color={Button.Colors.PRIMARY}
                            onClick={() => setStep("initial")}
                        >
                            Try Again
                        </Button>
                    </div>
                )}
            </ModalContent>
        </ModalRoot>
    );
}

// Helper functions
function generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(buffer: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}
