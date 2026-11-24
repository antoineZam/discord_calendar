/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { CSSProperties } from "react";

import { CalendarEvent, EventSource } from "../types";

export const SOURCES: Record<EventSource, { label: string; color: string; }> = {
    discord: { label: "Discord Events", color: "var(--brand-experiment)" },
    google: { label: "Google Calendar", color: "#4285F4" },
    outlook: { label: "Outlook Calendar", color: "#0078D4" },
};

export const SOURCE_KEYS = Object.keys(SOURCES) as EventSource[];

/** Exposes the source color to the stylesheet as `--event-color`. */
export const sourceColor = (source: EventSource) => ({ "--event-color": SOURCES[source].color }) as CSSProperties;

export const sourceLabel = (event: CalendarEvent) =>
    event.source === "discord" ? event.guildName || "Discord Event" : SOURCES[event.source].label;
