/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByProps } from "@webpack";
import { GuildScheduledEventStore, GuildStore } from "@webpack/common";
import { 
    CalendarEvent, 
    DiscordGuildEvent, 
    GoogleCalendarEvent, 
    OutlookCalendarEvent,
    DiscordEventEntityType
} from "../types";

// Try to get actions module - may not be available immediately
function getGuildScheduledEventActions() {
    try {
        return findByProps("fetchGuildScheduledEvents");
    } catch {
        return null;
    }
}

interface Settings {
    store: {
        googleCalendarEnabled: boolean;
        googleClientId: string;
        googleRefreshToken: string;
        outlookCalendarEnabled: boolean;
        outlookClientId: string;
        outlookRefreshToken: string;
        discordEventsEnabled: boolean;
        showPendingEvents: boolean;
        syncIntervalMinutes: number;
        optedInEvents: string;
    };
}

export class CalendarManager {
    private settings: Settings;
    private syncInterval: NodeJS.Timeout | null = null;
    private cachedEvents: CalendarEvent[] = [];
    private lastSync: Date | null = null;
    
    // Token storage
    private googleAccessToken: string | null = null;
    private googleTokenExpiry: number = 0;
    private outlookAccessToken: string | null = null;
    private outlookTokenExpiry: number = 0;
    
    constructor(settings: Settings) {
        this.settings = settings;
    }
    
    startSync() {
        // Delay initial sync to allow Discord stores to load
        console.log("[CalendarSync] Waiting for Discord to fully load...");
        setTimeout(() => {
            console.log("[CalendarSync] Starting initial sync...");
            this.syncAllCalendars();
            
            // Set up interval
            const intervalMs = this.settings.store.syncIntervalMinutes * 60 * 1000;
            this.syncInterval = setInterval(() => {
                this.syncAllCalendars();
            }, intervalMs);
            
            console.log(`[CalendarSync] Started sync with ${this.settings.store.syncIntervalMinutes}min interval`);
        }, 3000); // Wait 3 seconds for Discord to load
    }
    
    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        console.log("[CalendarSync] Stopped sync");
    }
    
    async syncAllCalendars() {
        console.log("[CalendarSync] Syncing all calendars...");
        
        const events: CalendarEvent[] = [];
        
        // Sync Discord events
        if (this.settings.store.discordEventsEnabled) {
            try {
                const discordEvents = await this.fetchDiscordEvents();
                events.push(...discordEvents);
            } catch (err) {
                console.error("[CalendarSync] Failed to fetch Discord events:", err);
            }
        }
        
        // Sync Google Calendar
        if (this.settings.store.googleCalendarEnabled && this.settings.store.googleRefreshToken) {
            try {
                const googleEvents = await this.fetchGoogleEvents();
                events.push(...googleEvents);
            } catch (err) {
                console.error("[CalendarSync] Failed to fetch Google events:", err);
            }
        }
        
        // Sync Outlook Calendar
        if (this.settings.store.outlookCalendarEnabled && this.settings.store.outlookRefreshToken) {
            try {
                const outlookEvents = await this.fetchOutlookEvents();
                events.push(...outlookEvents);
            } catch (err) {
                console.error("[CalendarSync] Failed to fetch Outlook events:", err);
            }
        }
        
        this.cachedEvents = events;
        this.lastSync = new Date();
        
        console.log(`[CalendarSync] Synced ${events.length} events`);
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
            console.warn("[CalendarSync] GuildStore not available yet");
            return events;
        }
        
        if (!GuildScheduledEventStore) {
            console.warn("[CalendarSync] GuildScheduledEventStore not available yet");
            return events;
        }
        
        const guilds = Object.values(GuildStore.getGuilds()) as any[];
        const optedInEvents = this.getOptedInEvents();
        
        console.log(`[CalendarSync] Fetching events from ${guilds.length} guilds...`);
        
        // Try to get the actions module (may not be available)
        const actions = getGuildScheduledEventActions();
        
        for (const guild of guilds) {
            try {
                // Try to fetch events for this guild via API (if available)
                if (actions && typeof actions.fetchGuildScheduledEvents === "function") {
                    try {
                        await actions.fetchGuildScheduledEvents(guild.id);
                    } catch {
                        // Silently continue - events might already be cached
                    }
                }
                
                // Get events from store - try multiple methods
                let guildEvents: any = null;
                
                try {
                    if (typeof GuildScheduledEventStore.getGuildScheduledEventsForGuild === "function") {
                        guildEvents = GuildScheduledEventStore.getGuildScheduledEventsForGuild(guild.id);
                    }
                } catch {
                    // Try alternative method
                }
                
                if (!guildEvents) {
                    try {
                        // Try getting all events and filtering
                        const allEvents = (GuildScheduledEventStore as any).getGuildScheduledEvents?.() || {};
                        guildEvents = {};
                        for (const [id, event] of Object.entries(allEvents)) {
                            if ((event as any)?.guild_id === guild.id) {
                                guildEvents[id] = event;
                            }
                        }
                    } catch {
                        guildEvents = {};
                    }
                }
                
                if (!guildEvents) guildEvents = {};
                
                const eventValues = Object.values(guildEvents) as DiscordGuildEvent[];
                
                if (eventValues.length > 0) {
                    console.log(`[CalendarSync] Found ${eventValues.length} events in ${guild.name}`);
                }
                
                for (const rawEvent of eventValues) {
                    if (!rawEvent || !rawEvent.id) continue;
                    
                    const isOptedIn = optedInEvents.includes(rawEvent.id) || 
                                      rawEvent.user_rsvp?.interested === true;
                    
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
                        guildIcon: guild.icon 
                            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
                            : undefined,
                        channelId: rawEvent.channel_id,
                        creatorId: rawEvent.creator_id,
                        creatorName: rawEvent.creator?.username,
                        creatorAvatar: rawEvent.creator?.avatar
                            ? `https://cdn.discordapp.com/avatars/${rawEvent.creator.id}/${rawEvent.creator.avatar}.png`
                            : undefined,
                        interestedCount: rawEvent.user_count,
                        coverImage: rawEvent.image
                            ? `https://cdn.discordapp.com/guild-events/${rawEvent.id}/${rawEvent.image}.png`
                            : undefined,
                        entityType: rawEvent.entity_type,
                        location: rawEvent.entity_metadata?.location,
                        color: "#5865f2",
                    };
                    
                    events.push(event);
                }
            } catch (err) {
                console.error(`[CalendarSync] Failed to process guild ${guild.name}:`, err);
            }
        }
        
        console.log(`[CalendarSync] Total Discord events found: ${events.length}`);
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
                calendarName: "Google Calendar",
                color: "#4285F4",
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
                calendarName: "Outlook Calendar",
                color: "#0078D4",
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
        
        const refreshToken = this.settings.store.googleRefreshToken;
        if (!refreshToken) return null;
        
        try {
            const response = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: this.settings.store.googleClientId,
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
            console.error("[CalendarSync] Failed to refresh Google token:", err);
            return null;
        }
    }
    
    private async getOutlookAccessToken(): Promise<string | null> {
        if (this.outlookAccessToken && Date.now() < this.outlookTokenExpiry) {
            return this.outlookAccessToken;
        }
        
        const refreshToken = this.settings.store.outlookRefreshToken;
        if (!refreshToken) return null;
        
        try {
            const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: this.settings.store.outlookClientId,
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
            console.error("[CalendarSync] Failed to refresh Outlook token:", err);
            return null;
        }
    }
    
    // Opt-in management
    getOptedInEvents(): string[] {
        try {
            return JSON.parse(this.settings.store.optedInEvents || "[]");
        } catch {
            return [];
        }
    }
    
    setOptedInEvents(events: string[]) {
        this.settings.store.optedInEvents = JSON.stringify(events);
    }
    
    async optInToEvent(eventId: string, guildId: string) {
        // Call Discord API to mark as interested
        const response = await fetch(
            `https://discord.com/api/v9/guilds/${guildId}/scheduled-events/${eventId}/users/@me`,
            {
                method: "PUT",
                headers: {
                    Authorization: this.getDiscordToken(),
                    "Content-Type": "application/json",
                },
            }
        );
        
        if (!response.ok) {
            throw new Error(`Failed to opt in: ${response.status}`);
        }
        
        // Update local state
        const optedIn = this.getOptedInEvents();
        if (!optedIn.includes(eventId)) {
            optedIn.push(eventId);
            this.setOptedInEvents(optedIn);
        }
        
        // Refresh events
        await this.syncAllCalendars();
    }
    
    async optOutOfEvent(eventId: string, guildId: string) {
        // Call Discord API to remove interest
        const response = await fetch(
            `https://discord.com/api/v9/guilds/${guildId}/scheduled-events/${eventId}/users/@me`,
            {
                method: "DELETE",
                headers: {
                    Authorization: this.getDiscordToken(),
                },
            }
        );
        
        if (!response.ok) {
            throw new Error(`Failed to opt out: ${response.status}`);
        }
        
        // Update local state
        const optedIn = this.getOptedInEvents();
        const index = optedIn.indexOf(eventId);
        if (index !== -1) {
            optedIn.splice(index, 1);
            this.setOptedInEvents(optedIn);
        }
        
        // Refresh events
        await this.syncAllCalendars();
    }
    
    private getDiscordToken(): string {
        // Get Discord token from the client
        const token = (window as any).webpackChunkdiscord_app?.push?.([[Symbol()], {}, r => {
            for (const m of Object.values(r.c)) {
                if ((m as any)?.exports?.default?.getToken) {
                    return (m as any).exports.default.getToken();
                }
            }
        }]);
        return token || "";
    }
}

