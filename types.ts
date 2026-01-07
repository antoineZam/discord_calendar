/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

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
    channelId?: string;
    creatorId?: string;
    creatorName?: string;
    creatorAvatar?: string;
    userCount?: number;
    interestedCount?: number;
    coverImage?: string;
    entityType?: DiscordEventEntityType;
    entityMetadata?: {
        location?: string;
    };
    // External calendar fields
    calendarId?: string;
    calendarName?: string;
    color?: string;
    recurrence?: string;
    attendees?: EventAttendee[];
    organizer?: {
        name?: string;
        email?: string;
    };
    // UI state
    isHovered?: boolean;
    isExpanded?: boolean;
}

export interface EventAttendee {
    name?: string;
    email?: string;
    responseStatus?: "accepted" | "declined" | "tentative" | "needsAction";
}

export enum DiscordEventEntityType {
    STAGE_INSTANCE = 1,
    VOICE = 2,
    EXTERNAL = 3,
}

export interface DiscordGuildEvent {
    id: string;
    guild_id: string;
    channel_id?: string;
    creator_id?: string;
    name: string;
    description?: string;
    scheduled_start_time: string;
    scheduled_end_time?: string;
    privacy_level: number;
    status: number;
    entity_type: DiscordEventEntityType;
    entity_id?: string;
    entity_metadata?: {
        location?: string;
    };
    creator?: {
        id: string;
        username: string;
        avatar?: string;
    };
    user_count?: number;
    image?: string;
    user_rsvp?: {
        user_id: string;
        guild_scheduled_event_id: string;
        interested: boolean;
    };
}

export interface GoogleCalendarEvent {
    id: string;
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    recurrence?: string[];
    attendees?: Array<{
        email: string;
        displayName?: string;
        responseStatus?: string;
    }>;
    organizer?: {
        email: string;
        displayName?: string;
    };
    colorId?: string;
}

export interface OutlookCalendarEvent {
    id: string;
    subject: string;
    body?: {
        contentType: string;
        content: string;
    };
    bodyPreview?: string;
    location?: {
        displayName?: string;
    };
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    isAllDay?: boolean;
    recurrence?: object;
    attendees?: Array<{
        emailAddress: {
            name?: string;
            address: string;
        };
        status: {
            response?: string;
        };
    }>;
    organizer?: {
        emailAddress: {
            name?: string;
            address: string;
        };
    };
}

export interface CalendarViewState {
    currentDate: Date;
    view: "month" | "week" | "day" | "agenda";
    selectedEvent: CalendarEvent | null;
    filters: {
        showDiscord: boolean;
        showGoogle: boolean;
        showOutlook: boolean;
        showPending: boolean;
    };
}

export interface OAuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

export interface CalendarSource {
    id: string;
    type: EventSource;
    name: string;
    enabled: boolean;
    color: string;
    lastSync?: Date;
}

