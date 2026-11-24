/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Guild, GuildScheduledEvent } from "@vencord/discord-types";
import { GuildScheduledEventStore, GuildStore, RestAPI } from "@webpack/common";

import { settings } from "../settings";
import { CalendarEvent, EventSource } from "../types";
import { HOUR_MS, MINUTE_MS } from "./date";
import { logger } from "./logger";
import { fetchProviderEvents } from "./providers";

/** Leaves Discord time to populate its stores before the first sync. */
const STARTUP_DELAY_MS = 3000;
/** How long synced events are considered fresh. */
const STALE_AFTER_MS = MINUTE_MS;
/** Scheduled events requests in flight at once: faster than one by one, gentle on rate limits. */
const GUILD_FETCH_CONCURRENCY = 4;

const FETCHERS: Record<EventSource, { enabled: () => boolean; fetch: () => Promise<CalendarEvent[]>; }> = {
    discord: { enabled: () => settings.store.discordEventsEnabled, fetch: fetchDiscordEvents },
    google: { enabled: () => settings.store.googleCalendarEnabled, fetch: () => fetchProviderEvents("google") },
    outlook: { enabled: () => settings.store.outlookCalendarEnabled, fetch: () => fetchProviderEvents("outlook") },
};

export class CalendarManager {
    private events: CalendarEvent[] = [];
    private listeners = new Set<() => void>();
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

    /** Sorted by start time, and replaced rather than mutated so React can compare snapshots. */
    getEvents = () => this.events;

    subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    get hasSynced() {
        return this.lastSync > 0;
    }

    private setEvents(events: CalendarEvent[]) {
        this.events = events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        this.listeners.forEach(listener => listener());
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
        const results = await Promise.all(Object.entries(FETCHERS).map(async ([source, { enabled, fetch }]) => {
            if (!enabled()) return [];
            try {
                return await fetch();
            } catch (err) {
                // A transient failure should not wipe the calendar: keep what this source returned last time
                logger.error(`Failed to fetch ${source} events:`, err);
                return this.events.filter(event => event.source === source);
            }
        }));

        this.lastSync = Date.now();
        this.setEvents(results.flat());
        logger.info(`Synced ${this.events.length} events`);
    }

    /** Marks a Discord event as interesting or not, then updates it in place instead of resyncing every guild. */
    async setInterest(event: CalendarEvent, interested: boolean) {
        if (event.source !== "discord" || !event.guildId) throw new Error("Only Discord events can be joined");

        const url = `/guilds/${event.guildId}/scheduled-events/${event.id}/users/@me`;
        await (interested ? RestAPI.put({ url }) : RestAPI.del({ url }));

        const optedIn = new Set(getOptedInEvents());
        if (interested) optedIn.add(event.id);
        else optedIn.delete(event.id);
        settings.store.optedInEvents = JSON.stringify([...optedIn]);

        const delta = interested ? 1 : -1;
        this.setEvents(this.events.map(e => e.id !== event.id ? e : {
            ...e,
            status: interested ? "opted_in" : "pending",
            interestedCount: e.interestedCount === undefined ? undefined : e.interestedCount + delta,
        }));
    }
}

export const calendarManager = new CalendarManager();

/** A scheduled event as returned by the REST API, which adds a few fields to the store's shape. */
type DiscordGuildEvent = GuildScheduledEvent & {
    creator?: { id: string; username: string; avatar?: string | null; };
    user_count?: number;
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
    const perGuild = await mapConcurrent(Object.values(GuildStore.getGuilds()), GUILD_FETCH_CONCURRENCY, async guild => {
        const info = guildInfo(guild);
        return (await fetchGuildEvents(guild.id)).map(raw => toCalendarEvent(raw, info, optedIn));
    });
    return perGuild.flat();
}

/** Like `Promise.all(items.map(fn))`, with at most `limit` calls in flight. */
async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await fn(items[index]);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
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
        // The local list covers guilds whose RSVPs Discord has not loaded yet
        status: optedIn.has(raw.id) || GuildScheduledEventStore.isInterestedInEventRecurrence(raw.id, null) ? "opted_in" : "pending",
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
