/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { GuildScheduledEventEntityType } from "@vencord/discord-types/enums";

export type EventSource = "discord" | "google" | "outlook";

export type EventStatus = "opted_in" | "pending" | "declined";

export interface CalendarEvent {
    id: string;
    source: EventSource;
    title: string;
    description?: string;
    location?: string;
    startTime: Date;
    endTime: Date;
    allDay?: boolean;
    status: EventStatus;
    // Discord-specific fields
    guildId?: string;
    guildName?: string;
    guildIcon?: string;
    creatorName?: string;
    creatorAvatar?: string;
    interestedCount?: number;
    coverImage?: string;
    entityType?: GuildScheduledEventEntityType;
    // External calendar fields
    attendees?: EventAttendee[];
    organizer?: {
        name?: string;
        email?: string;
    };
}

export interface EventAttendee {
    name?: string;
    email?: string;
    responseStatus?: "accepted" | "declined" | "tentative" | "needsAction";
}

export type CalendarView = "month" | "week" | "day" | "agenda";

export interface EventFilters {
    sources: Record<EventSource, boolean>;
    showPending: boolean;
}
