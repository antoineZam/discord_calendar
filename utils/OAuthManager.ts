/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { openModal, ModalRoot, ModalHeader, ModalContent, ModalCloseButton, ModalSize } from "@utils/modal";
import { Button, Forms, React, TextInput, useState } from "@webpack/common";

// Use VencordNative for opening external URLs
declare const VencordNative: {
    native: {
        openExternal: (url: string) => void;
    };
};

interface Settings {
    store: {
        googleClientId: string;
        googleRefreshToken: string;
        outlookClientId: string;
        outlookRefreshToken: string;
    };
}

// We'll use the "out-of-band" (OOB) or manual copy-paste flow since we can't run a local server
// Users will copy the authorization code from the browser

export class OAuthManager {
    private settings: Settings;

    constructor(settings: Settings) {
        this.settings = settings;
    }

    // Google OAuth - Opens modal for user to paste auth code
    async authenticateGoogle(): Promise<void> {
        const clientId = this.settings.store.googleClientId;
        if (!clientId) {
            throw new Error("Google Client ID not configured");
        }

        return new Promise((resolve, reject) => {
            openModal(props => (
                <OAuthModal
                    {...props}
                    provider="google"
                    clientId={clientId}
                    onSuccess={(refreshToken) => {
                        this.settings.store.googleRefreshToken = refreshToken;
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
        const clientId = this.settings.store.outlookClientId;
        if (!clientId) {
            throw new Error("Outlook Client ID not configured");
        }

        return new Promise((resolve, reject) => {
            openModal(props => (
                <OAuthModal
                    {...props}
                    provider="outlook"
                    clientId={clientId}
                    onSuccess={(refreshToken) => {
                        this.settings.store.outlookRefreshToken = refreshToken;
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

// OAuth Modal Component
interface OAuthModalProps {
    onClose: () => void;
    provider: "google" | "outlook";
    clientId: string;
    onSuccess: (refreshToken: string) => void;
    onError: (error: Error) => void;
}

function OAuthModal({ onClose, provider, clientId, onSuccess, onError }: OAuthModalProps) {
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
            // For desktop apps without a redirect, use OOB or localhost
            redirectUri: "urn:ietf:wg:oauth:2.0:oob",
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
        <ModalRoot size={ModalSize.SMALL}>
            <ModalHeader>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {provider === "google" ? <GoogleIcon /> : <OutlookIcon />}
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
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {step === "success" && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "24px" }}>
                        <div style={{
                            width: "48px",
                            height: "48px",
                            background: "#43b581",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
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

// Icons
function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    );
}

function OutlookIcon() {
    return (
        <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.156.154-.354.234-.594.234h-8.168v-6.09h2.168l.324-2.52h-2.492V8.59c0-.388.076-.68.228-.874.154-.194.422-.29.808-.29h1.328V5.2c-.458-.062-1.086-.092-1.882-.092-1.014 0-1.826.3-2.434.902-.608.6-.912 1.416-.912 2.448v1.606h-2.172v2.52h2.172v6.09H.832c-.23 0-.424-.08-.576-.234-.154-.152-.234-.346-.234-.576V7.387l11.5 6.326 12.478-6.326z" />
            <path fill="#0078D4" d="M23.16 5.426L12 11.387.84 5.426C.938 5.14 1.112 4.908 1.36 4.73c.248-.18.516-.268.806-.268h19.668c.29 0 .558.088.806.268.248.178.422.41.52.696z" />
        </svg>
    );
}
