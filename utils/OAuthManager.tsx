/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { classNameFactory } from "@api/Styles";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Forms, TextInput, useRef, useState } from "@webpack/common";

import { CheckIcon, SourceIcon } from "../components/Icons";
import { settings } from "../settings";
import { authorizationUrl, createPkce, exchangeCode, Provider, PROVIDERS } from "./providers";
import { SOURCES } from "./sources";

const cl = classNameFactory("calendar-sync-");

/**
 * Opens the authorization dialog and stores the refresh token once the user completes it.
 * Rejects if the dialog is closed first; failed attempts can be retried from the dialog.
 */
export async function authenticate(provider: Provider): Promise<void> {
    const { label, color } = SOURCES[provider];
    if (!PROVIDERS[provider].clientId()) throw new Error(`${label} client ID not configured`);

    return new Promise((resolve, reject) => {
        openModal(props => (
            <OAuthModal
                {...props}
                provider={provider}
                onSuccess={refreshToken => {
                    settings.store[PROVIDERS[provider].tokenKey] = refreshToken;
                    showNotification({ title: "CalendarSync", body: `Successfully connected to ${label}!`, color });
                    resolve();
                }}
            />
        ), { onCloseCallback: () => reject(new Error("Authorization cancelled")) });
    });
}

interface OAuthModalProps extends ModalProps {
    provider: Provider;
    onSuccess: (refreshToken: string) => void;
}

function OAuthModal({ transitionState, onClose, provider, onSuccess }: OAuthModalProps) {
    const [step, setStep] = useState<"initial" | "code" | "loading" | "success" | "error">("initial");
    const [authCode, setAuthCode] = useState("");
    const [error, setError] = useState("");
    const codeVerifier = useRef("");
    const { label: name, color } = SOURCES[provider];

    async function openAuthorization() {
        const { verifier, challenge } = await createPkce();
        codeVerifier.current = verifier;
        VencordNative.native.openExternal(authorizationUrl(provider, challenge));
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
            const refreshToken = await exchangeCode(provider, authCode.trim(), codeVerifier.current);
            setStep("success");
            onSuccess(refreshToken);

            setTimeout(() => onClose(), 1500);
        } catch (err) {
            setStep("error");
            setError(err instanceof Error ? err.message : "Unknown error occurred");
        }
    }

    return (
        <ModalRoot transitionState={transitionState} size={ModalSize.SMALL}>
            <ModalHeader>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <SourceIcon source={provider} size={24} />
                    <span style={{ fontSize: "16px", fontWeight: 600 }}>
                        Connect {name}
                    </span>
                </div>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent style={{ padding: "16px" }}>
                {step === "initial" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <Forms.FormText>
                            Click the button below to open the {name} authorization page in your browser.
                            After granting access, copy the authorization code and paste it here.
                        </Forms.FormText>
                        <Button
                            color={Button.Colors.BRAND}
                            onClick={openAuthorization}
                        >
                            Open {name} Authorization
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
                        <div className={cl("spinner")} style={{ borderTopColor: color }} />
                        <Forms.FormText>Connecting...</Forms.FormText>
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
