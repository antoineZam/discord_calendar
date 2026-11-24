/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { GuildScheduledEventStore, GuildStore, RestAPI } from "@webpack/common";

import { settings } from "../settings";
import { CalendarEvent, DiscordGuildEvent } from "../types";
import { MINUTE_MS } from "./date";
import { logger } from "./logger";
import { fetchProviderEvents } from "./providers";

/** Leaves Discord time to populate its stores before the first sync. */
const STARTUP_DELAY_MS = 3000;
/** How long synced events are considered fresh. */
const STALE_AFTER_MS = MINUTE_MS;

export class CalendarManager {
    private cachedEvents: CalendarEvent[] = [];
    private lastSync = 0;
    private pendingSync: Promise<void> | null = null;
    private timer?: ReturnType<typeof setTimeout>;
    private running = false;

    start() {
        this.stop();
        this.running = true;
        this.scheduleSync(STARTUP_DELAY_MS);
    }

    stop() {
        this.running = false;
        clearTimeout(this.timer);
        this.timer = undefined;
    }

    /** Re-arms itself after each sync, so a new interval applies without restarting and syncs never overlap. */
    private scheduleSync(delayMs: number) {
        this.timer = setTimeout(async () => {
            this.timer = undefined;
            await this.refresh();
            if (this.running && !this.timer) this.scheduleSync(settings.store.syncIntervalMinutes * MINUTE_MS);
        }, delayMs);
    }

    /** Syncs every enabled source. Concurrent calls share the same run. */
    sync() {
        return this.pendingSync ??= this.fetchAll().finally(() => {
            this.pendingSync = null;
        });
    }

    /** Syncs only when the events are older than {@link STALE_AFTER_MS}. */
    async refresh() {
        if (Date.now() - this.lastSync > STALE_AFTER_MS) await this.sync();
    }

    private async fetchAll() {
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
                const googleEvents = await fetchProviderEvents("google");
                events.push(...googleEvents);
            } catch (err) {
                logger.error("Failed to fetch Google events:", err);
            }
        }

        // Sync Outlook Calendar
        if (settings.store.outlookCalendarEnabled && settings.store.outlookRefreshToken) {
            try {
                const outlookEvents = await fetchProviderEvents("outlook");
                events.push(...outlookEvents);
            } catch (err) {
                logger.error("Failed to fetch Outlook events:", err);
            }
        }

        this.cachedEvents = events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        this.lastSync = Date.now();

        logger.info(`Synced ${events.length} events`);
    }

    async getAllEvents(start: Date, end: Date): Promise<CalendarEvent[]> {
        await this.refresh();

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
            await this.sync();
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
            await this.sync();
        } catch (err: any) {
            logger.error("Opt-out failed:", err);
            throw new Error(`Failed to opt out: ${err.message || err}`);
        }
    }
}

export const calendarManager = new CalendarManager();
