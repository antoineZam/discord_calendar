/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { React, useEffect, useMemo, useState } from "@webpack/common";

import { settings } from "../settings";
import { CalendarEvent, CalendarView, CalendarViewState, EventFilters, EventSource } from "../types";
import { calendarManager } from "../utils/CalendarManager";
import { addDays, formatFullDate, formatMediumDate, formatMonthYear, getMonthWeeks, isSameDay, shiftDate, startOfMonth, startOfWeek, WEEKDAY_NAMES } from "../utils/date";
import { logger } from "../utils/logger";
import { SOURCE_KEYS } from "../utils/sources";
import { CalendarFilters } from "./CalendarFilters";
import { CalendarGrid } from "./CalendarGrid";
import { EventCard } from "./EventCard";
import { EventDetails } from "./EventDetails";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "./Icons";

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
        view: settings.store.defaultCalendarView as CalendarView || "month",
        selectedEvent: null,
        filters: {
            sources: {
                discord: settings.store.discordEventsEnabled,
                google: settings.store.googleCalendarEnabled,
                outlook: settings.store.outlookCalendarEnabled,
            },
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
            const gridStart = startOfWeek(startOfMonth(viewState.currentDate));
            const allEvents = await calendarManager.getAllEvents(gridStart, addDays(gridStart, 42));
            setEvents(allEvents);
        } catch (err) {
            logger.error("Failed to fetch events:", err);
            setError("Failed to load events. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    const { filters } = viewState;
    const filteredEvents = useMemo(
        () => events.filter(event => filters.sources[event.source] && (event.status !== "pending" || filters.showPending)),
        [events, filters]
    );

    const eventCounts = useMemo(() => {
        const counts = Object.fromEntries(SOURCE_KEYS.map(source => [source, 0])) as Record<EventSource, number>;
        for (const event of events) counts[event.source]++;
        return counts;
    }, [events]);

    function navigate(direction: 1 | -1) {
        setViewState(prev => ({ ...prev, currentDate: shiftDate(prev.currentDate, prev.view, direction) }));
    }

    function navigateToday() {
        setViewState(prev => ({
            ...prev,
            currentDate: new Date(),
        }));
    }

    function setView(view: CalendarView) {
        setViewState(prev => ({ ...prev, view }));
    }

    function selectEvent(event: CalendarEvent | null) {
        setViewState(prev => ({ ...prev, selectedEvent: event }));
    }

    function setFilters(filters: EventFilters) {
        setViewState(prev => ({ ...prev, filters }));
    }

    async function handleOptIn(event: CalendarEvent) {
        if (event.source !== "discord") return;
        if (!event.guildId) {
            logger.error("Event missing guildId:", event);
            return;
        }

        setIsLoading(true);
        try {
            logger.debug(`Opting into event: ${event.id} in guild ${event.guildId}`);
            await calendarManager.optInToEvent(event.id, event.guildId);
            // Update selected event to show opted_in status
            selectEvent({ ...event, status: "opted_in" });
            await fetchEvents(); // Refresh events
        } catch (err) {
            logger.error("Failed to opt into event:", err);
            setError(`Failed to opt in: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleOptOut(event: CalendarEvent) {
        if (event.source !== "discord") return;
        if (!event.guildId) {
            logger.error("Event missing guildId:", event);
            return;
        }

        setIsLoading(true);
        try {
            logger.debug(`Opting out of event: ${event.id} in guild ${event.guildId}`);
            await calendarManager.optOutOfEvent(event.id, event.guildId);
            // Update selected event to show pending status
            selectEvent({ ...event, status: "pending" });
            await fetchEvents(); // Refresh events
        } catch (err) {
            logger.error("Failed to opt out of event:", err);
            setError(`Failed to opt out: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <ModalHeader className={cl("header")}>
                <div className={cl("header-left")}>
                    <h2 className={cl("title")}>
                        <CalendarIcon size={24} className={cl("title-icon")} />
                        Calendar
                    </h2>
                    <span className={cl("date-display")}>
                        {formatViewTitle(viewState.currentDate, viewState.view)}
                    </span>
                </div>
                <div className={cl("header-center")}>
                    <div className={cl("nav-buttons")}>
                        <button className={cl("nav-btn")} onClick={() => navigate(-1)}>
                            <ChevronLeftIcon />
                        </button>
                        <button className={cl("nav-btn", "today-btn")} onClick={navigateToday}>
                            Today
                        </button>
                        <button className={cl("nav-btn")} onClick={() => navigate(1)}>
                            <ChevronRightIcon />
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
                        filters={filters}
                        counts={eventCounts}
                        onChange={setFilters}
                    />

                    <div className={cl("mini-calendar")}>
                        <MiniCalendar
                            currentDate={viewState.currentDate}
                            onDateSelect={date => setViewState(prev => ({ ...prev, currentDate: date }))}
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
    const weeks = getMonthWeeks(currentDate);
    const today = new Date();

    return (
        <div className={cl("mini-calendar-grid")}>
            <div className={cl("mini-calendar-header")}>
                {WEEKDAY_NAMES.narrow.map((name, i) => (
                    <span key={i} className={cl("mini-day-header")}>{name}</span>
                ))}
            </div>
            {weeks.map((week, wi) => (
                <div key={wi} className={cl("mini-week")}>
                    {week.map((day, di) => {
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        const isToday = isSameDay(day, today);
                        const isSelected = isSameDay(day, currentDate);
                        const hasEvents = events.some(e => isSameDay(e.startTime, day));

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

function formatViewTitle(date: Date, view: CalendarView) {
    switch (view) {
        case "month": return formatMonthYear(date);
        case "week": return `Week of ${formatMediumDate(startOfWeek(date))}`;
        case "day": return formatFullDate(date);
        case "agenda": return "Upcoming Events";
    }
}

function getUpcomingEvents(events: CalendarEvent[], limit: number): CalendarEvent[] {
    const now = new Date();
    return events
        .filter(e => e.startTime >= now)
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
        .slice(0, limit);
}

