/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { GuildScheduledEventStore, GuildStore, RestAPI } from "@webpack/common";

import { settings } from "../settings";
import { CalendarEvent, DiscordGuildEvent, GoogleCalendarEvent, OutlookCalendarEvent } from "../types";
import { logger } from "./logger";
import { GOOGLE_CLIENT_ID } from "./OAuthManager";

export class CalendarManager {
    private syncInterval: NodeJS.Timeout | null = null;
    private cachedEvents: CalendarEvent[] = [];
    private lastSync: Date | null = null;

    // Token storage
    private googleAccessToken: string | null = null;
    private googleTokenExpiry: number = 0;
    private outlookAccessToken: string | null = null;
    private outlookTokenExpiry: number = 0;

    startSync() {
        // Delay initial sync to allow Discord stores to load
        logger.info("Waiting for Discord to fully load...");
        setTimeout(() => {
            logger.info("Starting initial sync...");
            this.syncAllCalendars();

            // Set up interval
            const intervalMs = settings.store.syncIntervalMinutes * 60 * 1000;
            this.syncInterval = setInterval(() => {
                this.syncAllCalendars();
            }, intervalMs);

            logger.info(`Started sync with ${settings.store.syncIntervalMinutes}min interval`);
        }, 3000); // Wait 3 seconds for Discord to load
    }

    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        logger.info("Stopped sync");
    }

    async syncAllCalendars() {
        logger.info("Syncing all calendars...");

        const events: CalendarEvent[] = [];

        // Sync Discord events
        if (settings.store.discordEventsEnabled) {
            try {
                const discordEvents = await this.fetchDiscordEvents();
                events.push(...discordEvents);
            } catch (err) {
                logger.error("Failed to fetch Discord events:", err);
            }
        }

        // Sync Google Calendar
        if (settings.store.googleCalendarEnabled && settings.store.googleRefreshToken) {
            try {
                const googleEvents = await this.fetchGoogleEvents();
                events.push(...googleEvents);
            } catch (err) {
                logger.error("Failed to fetch Google events:", err);
            }
        }

        // Sync Outlook Calendar
        if (settings.store.outlookCalendarEnabled && settings.store.outlookRefreshToken) {
            try {
                const outlookEvents = await this.fetchOutlookEvents();
                events.push(...outlookEvents);
            } catch (err) {
                logger.error("Failed to fetch Outlook events:", err);
            }
        }

        this.cachedEvents = events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        this.lastSync = new Date();

        logger.info(`Synced ${events.length} events`);
    }

    async getAllEvents(start: Date, end: Date): Promise<CalendarEvent[]> {
        // If cache is stale, refresh
        if (!this.lastSync || Date.now() - this.lastSync.getTime() > 60000) {
            await this.syncAllCalendars();
        }

        return this.cachedEvents.filter(event => {
            const eventStart = new Date(event.startTime);
            const eventEnd = new Date(event.endTime);
            return eventStart <= end && eventEnd >= start;
        });
    }

    // Discord Events
    async fetchDiscordEvents(): Promise<CalendarEvent[]> {
        const events: CalendarEvent[] = [];

        // Check if stores are available
        if (!GuildStore) {
            logger.warn("GuildStore not available yet");
            return events;
        }

        if (!GuildScheduledEventStore) {
            logger.warn("GuildScheduledEventStore not available yet");
            return events;
        }

        const guilds = Object.values(GuildStore.getGuilds()) as any[];
        const optedInEvents = this.getOptedInEvents();

        logger.info(`Fetching events from ${guilds.length} guilds...`);

        for (const guild of guilds) {
            try {
                // Fetch events directly via REST API
                let guildEvents: any = {};

                try {
                    const response = await RestAPI.get({
                        url: `/guilds/${guild.id}/scheduled-events`,
                        query: { with_user_count: true }
                    });

                    if (response?.body && Array.isArray(response.body)) {
                        for (const event of response.body) {
                            guildEvents[event.id] = event;
                        }
                    }
                } catch (apiErr) {
                    // Fallback to store if API fails
                    logger.debug(`API fetch failed for ${guild.name}, trying store...`);

                    try {
                        if (GuildScheduledEventStore && typeof GuildScheduledEventStore.getGuildScheduledEventsForGuild === "function") {
                            guildEvents = GuildScheduledEventStore.getGuildScheduledEventsForGuild(guild.id) || {};
                        }
                    } catch {
                        guildEvents = {};
                    }
                }

                const eventValues = Object.values(guildEvents) as DiscordGuildEvent[];

                if (eventValues.length > 0) {
                    logger.debug(`Found ${eventValues.length} events in ${guild.name}`);
                }

                for (const rawEvent of eventValues) {
                    if (!rawEvent || !rawEvent.id) continue;

                    const isOptedIn = optedInEvents.includes(rawEvent.id) ||
                                      rawEvent.user_rsvp?.interested === true;

                    // Build high-resolution image URLs
                    const guildIconUrl = guild.icon
                        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${guild.icon.startsWith("a_") ? "gif" : "webp"}?size=128`
                        : undefined;

                    const creatorAvatarUrl = rawEvent.creator?.avatar
                        ? `https://cdn.discordapp.com/avatars/${rawEvent.creator.id}/${rawEvent.creator.avatar}.${rawEvent.creator.avatar.startsWith("a_") ? "gif" : "webp"}?size=128`
                        : undefined;

                    // Event cover images - use highest quality (800x320 is the native size, but we can request larger)
                    const coverImageUrl = rawEvent.image
                        ? `https://cdn.discordapp.com/guild-events/${rawEvent.id}/${rawEvent.image}.webp?size=1024`
                        : undefined;

                    const event: CalendarEvent = {
                        id: rawEvent.id,
                        source: "discord",
                        title: rawEvent.name || "Untitled Event",
                        description: rawEvent.description,
                        startTime: new Date(rawEvent.scheduled_start_time),
                        endTime: rawEvent.scheduled_end_time
                            ? new Date(rawEvent.scheduled_end_time)
                            : new Date(new Date(rawEvent.scheduled_start_time).getTime() + 3600000),
                        status: isOptedIn ? "opted_in" : "pending",
                        guildId: rawEvent.guild_id || guild.id,
                        guildName: guild.name,
                        guildIcon: guildIconUrl,
                        creatorName: rawEvent.creator?.username,
                        creatorAvatar: creatorAvatarUrl,
                        interestedCount: rawEvent.user_count,
                        coverImage: coverImageUrl,
                        entityType: rawEvent.entity_type,
                        location: rawEvent.entity_metadata?.location,
                    };

                    events.push(event);
                }
            } catch (err) {
                logger.error(`Failed to process guild ${guild.name}:`, err);
            }
        }

        logger.info(`Total Discord events found: ${events.length}`);
        return events;
    }

    // Google Calendar Events
    async fetchGoogleEvents(): Promise<CalendarEvent[]> {
        const accessToken = await this.getGoogleAccessToken();
        if (!accessToken) return [];

        const now = new Date();
        const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

        const params = new URLSearchParams({
            timeMin: now.toISOString(),
            timeMax: threeMonthsLater.toISOString(),
            singleEvents: "true",
            orderBy: "startTime",
            maxResults: "100",
        });

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Google API error: ${response.status}`);
        }

        const data = await response.json();
        const events: CalendarEvent[] = [];

        for (const item of data.items || []) {
            const googleEvent = item as GoogleCalendarEvent;

            const startTime = googleEvent.start.dateTime
                ? new Date(googleEvent.start.dateTime)
                : new Date(googleEvent.start.date!);

            const endTime = googleEvent.end.dateTime
                ? new Date(googleEvent.end.dateTime)
                : new Date(googleEvent.end.date!);

            const event: CalendarEvent = {
                id: `google-${googleEvent.id}`,
                source: "google",
                title: googleEvent.summary || "(No title)",
                description: googleEvent.description,
                location: googleEvent.location,
                startTime,
                endTime,
                allDay: !googleEvent.start.dateTime,
                status: "opted_in", // External events are always "opted in"
                attendees: googleEvent.attendees?.map(a => ({
                    name: a.displayName,
                    email: a.email,
                    responseStatus: a.responseStatus as any,
                })),
                organizer: googleEvent.organizer ? {
                    name: googleEvent.organizer.displayName,
                    email: googleEvent.organizer.email,
                } : undefined,
            };

            events.push(event);
        }

        return events;
    }

    // Outlook Calendar Events
    async fetchOutlookEvents(): Promise<CalendarEvent[]> {
        const accessToken = await this.getOutlookAccessToken();
        if (!accessToken) return [];

        const now = new Date();
        const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

        const params = new URLSearchParams({
            startDateTime: now.toISOString(),
            endDateTime: threeMonthsLater.toISOString(),
            $top: "100",
            $orderby: "start/dateTime",
        });

        const response = await fetch(
            `https://graph.microsoft.com/v1.0/me/calendarView?${params}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Microsoft Graph API error: ${response.status}`);
        }

        const data = await response.json();
        const events: CalendarEvent[] = [];

        for (const item of data.value || []) {
            const outlookEvent = item as OutlookCalendarEvent;

            const event: CalendarEvent = {
                id: `outlook-${outlookEvent.id}`,
                source: "outlook",
                title: outlookEvent.subject || "(No title)",
                description: outlookEvent.bodyPreview,
                location: outlookEvent.location?.displayName,
                startTime: new Date(outlookEvent.start.dateTime + "Z"),
                endTime: new Date(outlookEvent.end.dateTime + "Z"),
                allDay: outlookEvent.isAllDay,
                status: "opted_in",
                attendees: outlookEvent.attendees?.map(a => ({
                    name: a.emailAddress.name,
                    email: a.emailAddress.address,
                    responseStatus: a.status.response as any,
                })),
                organizer: outlookEvent.organizer ? {
                    name: outlookEvent.organizer.emailAddress.name,
                    email: outlookEvent.organizer.emailAddress.address,
                } : undefined,
            };

            events.push(event);
        }

        return events;
    }

    // Token management
    private async getGoogleAccessToken(): Promise<string | null> {
        if (this.googleAccessToken && Date.now() < this.googleTokenExpiry) {
            return this.googleAccessToken;
        }

        const refreshToken = settings.store.googleRefreshToken;
        if (!refreshToken) return null;

        try {
            const response = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: GOOGLE_CLIENT_ID,
                    refresh_token: refreshToken,
                    grant_type: "refresh_token",
                }),
            });

            if (!response.ok) throw new Error("Token refresh failed");

            const data = await response.json();
            this.googleAccessToken = data.access_token;
            this.googleTokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;

            return this.googleAccessToken;
        } catch (err) {
            logger.error("Failed to refresh Google token:", err);
            return null;
        }
    }

    private async getOutlookAccessToken(): Promise<string | null> {
        if (this.outlookAccessToken && Date.now() < this.outlookTokenExpiry) {
            return this.outlookAccessToken;
        }

        const refreshToken = settings.store.outlookRefreshToken;
        if (!refreshToken) return null;

        try {
            const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: settings.store.outlookClientId,
                    refresh_token: refreshToken,
                    grant_type: "refresh_token",
                    scope: "Calendars.Read offline_access",
                }),
            });

            if (!response.ok) throw new Error("Token refresh failed");

            const data = await response.json();
            this.outlookAccessToken = data.access_token;
            this.outlookTokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;

            return this.outlookAccessToken;
        } catch (err) {
            logger.error("Failed to refresh Outlook token:", err);
            return null;
        }
    }

    // Opt-in management
    getOptedInEvents(): string[] {
        try {
            return JSON.parse(settings.store.optedInEvents || "[]");
        } catch {
            return [];
        }
    }

    setOptedInEvents(events: string[]) {
        settings.store.optedInEvents = JSON.stringify(events);
    }

    async optInToEvent(eventId: string, guildId: string) {
        logger.debug(`Opting into event ${eventId} in guild ${guildId}`);

        try {
            // Use Vencord's RestAPI which handles authentication automatically
            await RestAPI.put({
                url: `/guilds/${guildId}/scheduled-events/${eventId}/users/@me`,
            });

            logger.debug(`Successfully opted into event ${eventId}`);

            // Update local state
            const optedIn = this.getOptedInEvents();
            if (!optedIn.includes(eventId)) {
                optedIn.push(eventId);
                this.setOptedInEvents(optedIn);
            }

            // Refresh events
            await this.syncAllCalendars();
        } catch (err: any) {
            logger.error("Opt-in failed:", err);
            throw new Error(`Failed to opt in: ${err.message || err}`);
        }
    }

    async optOutOfEvent(eventId: string, guildId: string) {
        logger.debug(`Opting out of event ${eventId} in guild ${guildId}`);

        try {
            // Use Vencord's RestAPI which handles authentication automatically
            await RestAPI.del({
                url: `/guilds/${guildId}/scheduled-events/${eventId}/users/@me`,
            });

            logger.debug(`Successfully opted out of event ${eventId}`);

            // Update local state
            const optedIn = this.getOptedInEvents();
            const index = optedIn.indexOf(eventId);
            if (index !== -1) {
                optedIn.splice(index, 1);
                this.setOptedInEvents(optedIn);
            }

            // Refresh events
            await this.syncAllCalendars();
        } catch (err: any) {
            logger.error("Opt-out failed:", err);
            throw new Error(`Failed to opt out: ${err.message || err}`);
        }
    }
}

export const calendarManager = new CalendarManager();
