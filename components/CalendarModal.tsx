/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { React, useEffect, useMemo, useState } from "@webpack/common";
import { CalendarEvent, CalendarViewState } from "../types";
import { calendarManager } from "../index";
import { settings } from "../index";
import { CalendarGrid } from "./CalendarGrid";
import { EventCard } from "./EventCard";
import { CalendarFilters } from "./CalendarFilters";
import { EventDetails } from "./EventDetails";

const cl = classNameFactory("calendar-sync-");

export function openCalendarModal() {
    openModal(props => (
        <ModalRoot {...props} size={ModalSize.LARGE} className={cl("modal")}>
            <CalendarModalContent onClose={props.onClose} />
        </ModalRoot>
    ));
}

interface CalendarModalProps {
    onClose: () => void;
}

function CalendarModalContent({ onClose }: CalendarModalProps) {
    const [viewState, setViewState] = useState<CalendarViewState>({
        currentDate: new Date(),
        view: settings.store.defaultCalendarView as CalendarViewState["view"] || "month",
        selectedEvent: null,
        filters: {
            showDiscord: settings.store.discordEventsEnabled,
            showGoogle: settings.store.googleCalendarEnabled,
            showOutlook: settings.store.outlookCalendarEnabled,
            showPending: settings.store.showPendingEvents,
        },
    });

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch events on mount and when filters change
    useEffect(() => {
        fetchEvents();
    }, [viewState.currentDate, viewState.filters]);

    async function fetchEvents() {
        setIsLoading(true);
        setError(null);
        
        try {
            const allEvents = await calendarManager.getAllEvents(
                getMonthStart(viewState.currentDate),
                getMonthEnd(viewState.currentDate)
            );
            setEvents(allEvents);
        } catch (err) {
            console.error("[CalendarSync] Failed to fetch events:", err);
            setError("Failed to load events. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    // Filter events based on current filters
    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            // Filter by source
            if (event.source === "discord" && !viewState.filters.showDiscord) return false;
            if (event.source === "google" && !viewState.filters.showGoogle) return false;
            if (event.source === "outlook" && !viewState.filters.showOutlook) return false;
            
            // Filter pending events
            if (event.status === "pending" && !viewState.filters.showPending) return false;
            
            return true;
        });
    }, [events, viewState.filters]);

    // Navigation functions
    function navigatePrevious() {
        setViewState(prev => ({
            ...prev,
            currentDate: navigateDate(prev.currentDate, prev.view, -1),
        }));
    }

    function navigateNext() {
        setViewState(prev => ({
            ...prev,
            currentDate: navigateDate(prev.currentDate, prev.view, 1),
        }));
    }

    function navigateToday() {
        setViewState(prev => ({
            ...prev,
            currentDate: new Date(),
        }));
    }

    function setView(view: CalendarViewState["view"]) {
        setViewState(prev => ({ ...prev, view }));
    }

    function selectEvent(event: CalendarEvent | null) {
        setViewState(prev => ({ ...prev, selectedEvent: event }));
    }

    function updateFilter(key: keyof CalendarViewState["filters"], value: boolean) {
        setViewState(prev => ({
            ...prev,
            filters: { ...prev.filters, [key]: value },
        }));
    }

    async function handleOptIn(event: CalendarEvent) {
        if (event.source !== "discord") return;
        
        try {
            await calendarManager.optInToEvent(event.id, event.guildId!);
            await fetchEvents(); // Refresh events
        } catch (err) {
            console.error("[CalendarSync] Failed to opt into event:", err);
        }
    }

    async function handleOptOut(event: CalendarEvent) {
        if (event.source !== "discord") return;
        
        try {
            await calendarManager.optOutOfEvent(event.id, event.guildId!);
            await fetchEvents(); // Refresh events
        } catch (err) {
            console.error("[CalendarSync] Failed to opt out of event:", err);
        }
    }

    return (
        <>
            <ModalHeader className={cl("header")}>
                <div className={cl("header-left")}>
                    <h2 className={cl("title")}>
                        <svg className={cl("title-icon")} viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
                        </svg>
                        Calendar
                    </h2>
                    <span className={cl("date-display")}>
                        {formatDateHeader(viewState.currentDate, viewState.view)}
                    </span>
                </div>
                <div className={cl("header-center")}>
                    <div className={cl("nav-buttons")}>
                        <button className={cl("nav-btn")} onClick={navigatePrevious}>
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                            </svg>
                        </button>
                        <button className={cl("nav-btn", "today-btn")} onClick={navigateToday}>
                            Today
                        </button>
                        <button className={cl("nav-btn")} onClick={navigateNext}>
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div className={cl("header-right")}>
                    <div className={cl("view-switcher")}>
                        {(["month", "week", "day", "agenda"] as const).map(v => (
                            <button
                                key={v}
                                className={cl("view-btn", viewState.view === v && "active")}
                                onClick={() => setView(v)}
                            >
                                {v.charAt(0).toUpperCase() + v.slice(1)}
                            </button>
                        ))}
                    </div>
                    <ModalCloseButton onClick={onClose} />
                </div>
            </ModalHeader>
            
            <ModalContent className={cl("content")}>
                <div className={cl("sidebar")}>
                    <CalendarFilters
                        filters={viewState.filters}
                        onUpdateFilter={updateFilter}
                        eventCounts={{
                            discord: events.filter(e => e.source === "discord").length,
                            google: events.filter(e => e.source === "google").length,
                            outlook: events.filter(e => e.source === "outlook").length,
                        }}
                    />
                    
                    <div className={cl("mini-calendar")}>
                        <MiniCalendar
                            currentDate={viewState.currentDate}
                            onDateSelect={(date) => setViewState(prev => ({ ...prev, currentDate: date }))}
                            events={filteredEvents}
                        />
                    </div>
                    
                    <div className={cl("upcoming-events")}>
                        <h3 className={cl("section-title")}>Upcoming Events</h3>
                        <div className={cl("events-list")}>
                            {getUpcomingEvents(filteredEvents, 5).map(event => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    compact
                                    onClick={() => selectEvent(event)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className={cl("main")}>
                    {isLoading ? (
                        <div className={cl("loading")}>
                            <div className={cl("spinner")} />
                            <span>Loading events...</span>
                        </div>
                    ) : error ? (
                        <div className={cl("error")}>
                            <span>{error}</span>
                            <button onClick={fetchEvents}>Retry</button>
                        </div>
                    ) : (
                        <CalendarGrid
                            view={viewState.view}
                            currentDate={viewState.currentDate}
                            events={filteredEvents}
                            selectedEvent={viewState.selectedEvent}
                            onSelectEvent={selectEvent}
                        />
                    )}
                </div>
                
                {viewState.selectedEvent && (
                    <EventDetails
                        event={viewState.selectedEvent}
                        onClose={() => selectEvent(null)}
                        onOptIn={handleOptIn}
                        onOptOut={handleOptOut}
                    />
                )}
            </ModalContent>
        </>
    );
}

// Mini calendar component for sidebar
function MiniCalendar({ 
    currentDate, 
    onDateSelect, 
    events 
}: { 
    currentDate: Date; 
    onDateSelect: (date: Date) => void;
    events: CalendarEvent[];
}) {
    const monthStart = getMonthStart(currentDate);
    const monthEnd = getMonthEnd(currentDate);
    const startDate = getWeekStart(monthStart);
    
    const weeks: Date[][] = [];
    let current = new Date(startDate);
    
    while (current <= monthEnd || weeks.length < 6) {
        const week: Date[] = [];
        for (let i = 0; i < 7; i++) {
            week.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        weeks.push(week);
        if (weeks.length >= 6) break;
    }
    
    const today = new Date();
    
    return (
        <div className={cl("mini-calendar-grid")}>
            <div className={cl("mini-calendar-header")}>
                {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                    <span key={i} className={cl("mini-day-header")}>{day}</span>
                ))}
            </div>
            {weeks.map((week, wi) => (
                <div key={wi} className={cl("mini-week")}>
                    {week.map((day, di) => {
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        const isToday = isSameDay(day, today);
                        const isSelected = isSameDay(day, currentDate);
                        const hasEvents = events.some(e => isSameDay(new Date(e.startTime), day));
                        
                        return (
                            <button
                                key={di}
                                className={cl(
                                    "mini-day",
                                    !isCurrentMonth && "other-month",
                                    isToday && "today",
                                    isSelected && "selected",
                                    hasEvents && "has-events"
                                )}
                                onClick={() => onDateSelect(day)}
                            >
                                {day.getDate()}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

// Helper functions
function getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
}

function navigateDate(date: Date, view: CalendarViewState["view"], direction: number): Date {
    const d = new Date(date);
    switch (view) {
        case "month":
            d.setMonth(d.getMonth() + direction);
            break;
        case "week":
            d.setDate(d.getDate() + (7 * direction));
            break;
        case "day":
            d.setDate(d.getDate() + direction);
            break;
        case "agenda":
            d.setDate(d.getDate() + (7 * direction));
            break;
    }
    return d;
}

function formatDateHeader(date: Date, view: CalendarViewState["view"]): string {
    const options: Intl.DateTimeFormatOptions = {};
    
    switch (view) {
        case "month":
            options.month = "long";
            options.year = "numeric";
            break;
        case "week":
            return `Week of ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
        case "day":
            options.weekday = "long";
            options.month = "long";
            options.day = "numeric";
            options.year = "numeric";
            break;
        case "agenda":
            return "Upcoming Events";
    }
    
    return date.toLocaleDateString(undefined, options);
}

function getUpcomingEvents(events: CalendarEvent[], limit: number): CalendarEvent[] {
    const now = new Date();
    return events
        .filter(e => new Date(e.startTime) >= now)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, limit);
}

