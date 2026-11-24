/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { classNameFactory } from "@api/Styles";
import { Paragraph } from "@components/Paragraph";
import type { ModalAction, RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, TextInput, useRef, useState } from "@webpack/common";

import { CheckIcon, SourceIcon } from "../components/Icons";
import { settings } from "../settings";
import { authorizationUrl, createPkce, exchangeCode, Provider, PROVIDERS } from "./providers";
import { SOURCES } from "./sources";

const cl = classNameFactory("calendar-sync-oauth-");

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

type Step = "authorize" | "code" | "success";

interface OAuthModalProps extends RenderModalProps {
    provider: Provider;
    onSuccess: (refreshToken: string) => void;
}

function OAuthModal({ provider, onSuccess, ...modalProps }: OAuthModalProps) {
    const [step, setStep] = useState<Step>("authorize");
    const [authCode, setAuthCode] = useState("");
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState("");
    const codeVerifier = useRef("");
    const { label: name } = SOURCES[provider];

    function goTo(next: Step) {
        setError("");
        setStep(next);
    }

    async function openAuthorization() {
        const { verifier, challenge } = await createPkce();
        codeVerifier.current = verifier;
        VencordNative.native.openExternal(authorizationUrl(provider, challenge));
        goTo("code");
    }

    async function submitCode() {
        const code = authCode.trim();
        if (!code) return setError("Please enter the authorization code");

        setConnecting(true);
        setError("");

        try {
            const refreshToken = await exchangeCode(provider, code, codeVerifier.current);
            setStep("success");
            onSuccess(refreshToken);

            setTimeout(modalProps.onClose, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error occurred");
        } finally {
            setConnecting(false);
        }
    }

    const actions: Record<Step, ModalAction[]> = {
        authorize: [
            { text: `Open ${name} Authorization`, variant: "primary", onClick: openAuthorization },
        ],
        code: [
            { text: "Back", variant: "secondary", onClick: () => goTo("authorize"), disabled: connecting },
            { text: "Connect", variant: "primary", onClick: submitCode, loading: connecting },
        ],
        success: [],
    };

    return (
        <Modal
            {...modalProps}
            size="sm"
            title={
                <span className={cl("title")}>
                    <SourceIcon source={provider} size={24} />
                    Connect {name}
                </span>
            }
            notice={error ? { message: error, type: "critical" } : undefined}
            actions={actions[step]}
        >
            {step === "authorize" && (
                <Paragraph>
                    Click the button below to open the {name} authorization page in your browser.
                    After granting access, copy the authorization code and paste it here.
                </Paragraph>
            )}

            {step === "code" && (
                <div className={cl("code")}>
                    <Paragraph>
                        After authorizing, you'll see an authorization code.
                        Copy and paste that code below:
                    </Paragraph>
                    <TextInput
                        placeholder="Paste authorization code here..."
                        value={authCode}
                        onChange={setAuthCode}
                    />
                </div>
            )}

            {step === "success" && (
                <div className={cl("success")}>
                    <div className={cl("success-icon")}>
                        <CheckIcon size={24} />
                    </div>
                    <Paragraph size="md" weight="medium">Connected Successfully!</Paragraph>
                </div>
            )}
        </Modal>
    );
}
