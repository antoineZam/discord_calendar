/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Guild, GuildScheduledEvent } from "@vencord/discord-types";
import { GuildScheduledEventStore, GuildStore, RestAPI } from "@webpack/common";

import { settings } from "../settings";
import { CalendarEvent } from "../types";
import { HOUR_MS, MINUTE_MS } from "./date";
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
                const discordEvents = await fetchDiscordEvents();
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

    // Opt-in management
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
            const optedIn = getOptedInEvents();
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
            const optedIn = getOptedInEvents();
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

/** A scheduled event as returned by the REST API, which adds a few fields to the store's shape. */
type DiscordGuildEvent = GuildScheduledEvent & {
    creator?: { id: string; username: string; avatar?: string | null; };
    user_count?: number;
    user_rsvp?: { interested: boolean; };
};

type GuildInfo = Pick<CalendarEvent, "guildId" | "guildName" | "guildIcon">;

function getOptedInEvents(): string[] {
    try {
        return JSON.parse(settings.store.optedInEvents || "[]");
    } catch {
        return [];
    }
}

async function fetchDiscordEvents() {
    const optedIn = new Set(getOptedInEvents());
    const events: CalendarEvent[] = [];

    for (const guild of Object.values(GuildStore.getGuilds())) {
        const info = guildInfo(guild);
        for (const raw of await fetchGuildEvents(guild.id))
            events.push(toCalendarEvent(raw, info, optedIn));
    }

    return events;
}

/** Asks the API, since the store only knows the events of guilds opened during this session. */
async function fetchGuildEvents(guildId: string): Promise<DiscordGuildEvent[]> {
    try {
        const { body } = await RestAPI.get({ url: `/guilds/${guildId}/scheduled-events`, query: { with_user_count: true } });
        return Array.isArray(body) ? body : [];
    } catch (err) {
        logger.debug(`Scheduled events request failed for guild ${guildId}, falling back to the store`, err);
        return GuildScheduledEventStore.getGuildScheduledEventsForGuild(guildId);
    }
}

function guildInfo(guild: Guild): GuildInfo {
    return { guildId: guild.id, guildName: guild.name, guildIcon: cdnImage("icons", guild.id, guild.icon) };
}

function toCalendarEvent(raw: DiscordGuildEvent, guild: GuildInfo, optedIn: Set<string>): CalendarEvent {
    const startTime = new Date(raw.scheduled_start_time);

    return {
        ...guild,
        id: raw.id,
        source: "discord",
        title: raw.name || "Untitled Event",
        description: raw.description ?? undefined,
        location: raw.entity_metadata?.location,
        startTime,
        endTime: raw.scheduled_end_time ? new Date(raw.scheduled_end_time) : new Date(startTime.getTime() + HOUR_MS),
        status: optedIn.has(raw.id) || raw.user_rsvp?.interested ? "opted_in" : "pending",
        creatorName: raw.creator?.username,
        creatorAvatar: cdnImage("avatars", raw.creator?.id, raw.creator?.avatar),
        interestedCount: raw.user_count,
        coverImage: raw.image ? `https://cdn.discordapp.com/guild-events/${raw.id}/${raw.image}.webp?size=1024` : undefined,
        entityType: raw.entity_type,
    };
}

/** Animated images have a hash starting with "a_". */
function cdnImage(kind: "icons" | "avatars", id?: string, hash?: string | null) {
    if (!id || !hash) return undefined;
    return `https://cdn.discordapp.com/${kind}/${id}/${hash}.${hash.startsWith("a_") ? "gif" : "webp"}?size=128`;
}
