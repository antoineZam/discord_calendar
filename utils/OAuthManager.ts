/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import http from "http";
import { URL } from "url";

interface Settings {
    store: {
        googleClientId: string;
        googleRefreshToken: string;
        outlookClientId: string;
        outlookRefreshToken: string;
    };
}

const REDIRECT_PORT = 38420;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

export class OAuthManager {
    private settings: Settings;
    private server: http.Server | null = null;
    
    constructor(settings: Settings) {
        this.settings = settings;
    }
    
    // Google OAuth
    async authenticateGoogle(): Promise<void> {
        const clientId = this.settings.store.googleClientId;
        if (!clientId) {
            throw new Error("Google Client ID not configured");
        }
        
        const state = this.generateState();
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        
        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.readonly");
        authUrl.searchParams.set("access_type", "offline");
        authUrl.searchParams.set("prompt", "consent");
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("code_challenge", codeChallenge);
        authUrl.searchParams.set("code_challenge_method", "S256");
        
        return new Promise((resolve, reject) => {
            this.startCallbackServer(async (code, receivedState) => {
                if (receivedState !== state) {
                    reject(new Error("State mismatch"));
                    return;
                }
                
                try {
                    // Exchange code for tokens
                    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({
                            client_id: clientId,
                            code,
                            code_verifier: codeVerifier,
                            grant_type: "authorization_code",
                            redirect_uri: REDIRECT_URI,
                        }),
                    });
                    
                    if (!tokenResponse.ok) {
                        const error = await tokenResponse.text();
                        throw new Error(`Token exchange failed: ${error}`);
                    }
                    
                    const tokens = await tokenResponse.json();
                    
                    // Store refresh token
                    this.settings.store.googleRefreshToken = tokens.refresh_token;
                    
                    showNotification({
                        title: "CalendarSync",
                        body: "Successfully connected to Google Calendar!",
                        color: "#34A853",
                    });
                    
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
            
            // Open browser
            this.openBrowser(authUrl.toString());
        });
    }
    
    // Outlook OAuth
    async authenticateOutlook(): Promise<void> {
        const clientId = this.settings.store.outlookClientId;
        if (!clientId) {
            throw new Error("Outlook Client ID not configured");
        }
        
        const state = this.generateState();
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        
        const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "Calendars.Read offline_access");
        authUrl.searchParams.set("response_mode", "query");
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("code_challenge", codeChallenge);
        authUrl.searchParams.set("code_challenge_method", "S256");
        
        return new Promise((resolve, reject) => {
            this.startCallbackServer(async (code, receivedState) => {
                if (receivedState !== state) {
                    reject(new Error("State mismatch"));
                    return;
                }
                
                try {
                    // Exchange code for tokens
                    const tokenResponse = await fetch(
                        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/x-www-form-urlencoded" },
                            body: new URLSearchParams({
                                client_id: clientId,
                                code,
                                code_verifier: codeVerifier,
                                grant_type: "authorization_code",
                                redirect_uri: REDIRECT_URI,
                                scope: "Calendars.Read offline_access",
                            }),
                        }
                    );
                    
                    if (!tokenResponse.ok) {
                        const error = await tokenResponse.text();
                        throw new Error(`Token exchange failed: ${error}`);
                    }
                    
                    const tokens = await tokenResponse.json();
                    
                    // Store refresh token
                    this.settings.store.outlookRefreshToken = tokens.refresh_token;
                    
                    showNotification({
                        title: "CalendarSync",
                        body: "Successfully connected to Outlook Calendar!",
                        color: "#0078D4",
                    });
                    
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
            
            // Open browser
            this.openBrowser(authUrl.toString());
        });
    }
    
    private startCallbackServer(callback: (code: string, state: string) => void) {
        // Close existing server if any
        this.stopCallbackServer();
        
        this.server = http.createServer((req, res) => {
            const url = new URL(req.url || "", `http://localhost:${REDIRECT_PORT}`);
            
            if (url.pathname === "/callback") {
                const code = url.searchParams.get("code");
                const state = url.searchParams.get("state");
                const error = url.searchParams.get("error");
                
                if (error) {
                    res.writeHead(400, { "Content-Type": "text/html" });
                    res.end(this.getErrorPage(error));
                    this.stopCallbackServer();
                    return;
                }
                
                if (code && state) {
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.end(this.getSuccessPage());
                    callback(code, state);
                    
                    // Close server after a short delay
                    setTimeout(() => this.stopCallbackServer(), 1000);
                } else {
                    res.writeHead(400, { "Content-Type": "text/html" });
                    res.end(this.getErrorPage("Missing code or state"));
                }
            } else {
                res.writeHead(404);
                res.end("Not found");
            }
        });
        
        this.server.listen(REDIRECT_PORT);
        console.log(`[CalendarSync] OAuth callback server listening on port ${REDIRECT_PORT}`);
        
        // Auto-close after 5 minutes
        setTimeout(() => this.stopCallbackServer(), 5 * 60 * 1000);
    }
    
    private stopCallbackServer() {
        if (this.server) {
            this.server.close();
            this.server = null;
            console.log("[CalendarSync] OAuth callback server stopped");
        }
    }
    
    private openBrowser(url: string) {
        // Use Discord's built-in shell module or native require
        const { shell } = require("electron");
        shell.openExternal(url);
    }
    
    private generateState(): string {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, b => b.toString(16).padStart(2, "0")).join("");
    }
    
    private generateCodeVerifier(): string {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return this.base64UrlEncode(array);
    }
    
    private async generateCodeChallenge(verifier: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest("SHA-256", data);
        return this.base64UrlEncode(new Uint8Array(digest));
    }
    
    private base64UrlEncode(buffer: Uint8Array): string {
        const base64 = btoa(String.fromCharCode(...buffer));
        return base64
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    }
    
    private getSuccessPage(): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>CalendarSync - Connected!</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }
        .container {
            text-align: center;
            padding: 3rem;
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .icon {
            width: 80px;
            height: 80px;
            margin-bottom: 1.5rem;
            background: linear-gradient(135deg, #34a853 0%, #4caf50 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
        }
        .icon svg { width: 40px; height: 40px; }
        h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
        p { color: rgba(255,255,255,0.7); }
        .hint {
            margin-top: 1.5rem;
            font-size: 0.875rem;
            color: rgba(255,255,255,0.5);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">
            <svg viewBox="0 0 24 24" fill="white">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
        </div>
        <h1>Successfully Connected!</h1>
        <p>Your calendar has been linked to CalendarSync.</p>
        <p class="hint">You can close this window and return to Discord.</p>
    </div>
</body>
</html>`;
    }
    
    private getErrorPage(error: string): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>CalendarSync - Error</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }
        .container {
            text-align: center;
            padding: 3rem;
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .icon {
            width: 80px;
            height: 80px;
            margin-bottom: 1.5rem;
            background: linear-gradient(135deg, #e53935 0%, #f44336 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
        }
        .icon svg { width: 40px; height: 40px; }
        h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
        p { color: rgba(255,255,255,0.7); }
        .error { 
            margin-top: 1rem;
            padding: 0.75rem 1rem;
            background: rgba(229,57,53,0.2);
            border-radius: 8px;
            font-family: monospace;
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">
            <svg viewBox="0 0 24 24" fill="white">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
        </div>
        <h1>Connection Failed</h1>
        <p>There was an error connecting your calendar.</p>
        <div class="error">${error}</div>
    </div>
</body>
</html>`;
    }
}

