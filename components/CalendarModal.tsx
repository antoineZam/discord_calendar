/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import type { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, React, useEffect, useMemo, useState } from "@webpack/common";

import { settings } from "../settings";
import { CalendarEvent, CalendarView, EventFilters, EventSource } from "../types";
import { calendarManager } from "../utils/CalendarManager";
import { dayKey, EventsByDay, formatFullDate, formatMediumDate, formatMonthYear, getMonthWeeks, groupByDay, isSameDay, shiftDate, startOfWeek, WEEKDAY_NAMES } from "../utils/date";
import { logger } from "../utils/logger";
import { SOURCE_KEYS } from "../utils/sources";
import { CalendarFilters } from "./CalendarFilters";
import { CalendarGrid } from "./CalendarGrid";
import { EventCard } from "./EventCard";
import { EventDetails } from "./EventDetails";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "./Icons";

const cl = classNameFactory("calendar-sync-");

export function openCalendarModal() {
    openModal(props => <CalendarModal {...props} />);
}

const VIEWS: CalendarView[] = ["month", "week", "day", "agenda"];
const UPCOMING_LIMIT = 5;

function initialFilters(): EventFilters {
    const { discordEventsEnabled, googleCalendarEnabled, outlookCalendarEnabled, showPendingEvents } = settings.store;
    return {
        sources: { discord: discordEventsEnabled, google: googleCalendarEnabled, outlook: outlookCalendarEnabled },
        showPending: showPendingEvents,
    };
}

function CalendarModal(modalProps: RenderModalProps) {
    const events = React.useSyncExternalStore(calendarManager.subscribe, calendarManager.getEvents);
    const [loading, setLoading] = useState(!calendarManager.hasSynced);
    const [error, setError] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [view, setView] = useState(() => settings.store.defaultCalendarView as CalendarView || "month");
    const [filters, setFilters] = useState(initialFilters);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        calendarManager.refresh().finally(() => setLoading(false));
    }, []);

    const filteredEvents = useMemo(
        () => events.filter(event => filters.sources[event.source] && (event.status !== "pending" || filters.showPending)),
        [events, filters]
    );

    const eventsByDay = useMemo(() => groupByDay(filteredEvents), [filteredEvents]);

    const eventCounts = useMemo(() => {
        const counts = Object.fromEntries(SOURCE_KEYS.map(source => [source, 0])) as Record<EventSource, number>;
        for (const event of events) counts[event.source]++;
        return counts;
    }, [events]);

    // Looked up on every render so the details panel follows status changes
    const selectedEvent = events.find(event => event.id === selectedId);
    const selectEvent = (event: CalendarEvent | null) => setSelectedId(event?.id ?? null);

    async function changeInterest(event: CalendarEvent, interested: boolean) {
        try {
            await calendarManager.setInterest(event, interested);
        } catch (err) {
            logger.error("Failed to update event interest:", err);
            setError(`Failed to update your interest: ${err instanceof Error ? err.message : err}`);
        }
    }

    const header = (
        <div className={cl("header")}>
            <div className={cl("header-left")}>
                <h2 className={cl("title")}>
                    <CalendarIcon size={24} className={cl("title-icon")} />
                    Calendar
                </h2>
                <span className={cl("date-display")}>
                    {formatViewTitle(currentDate, view)}
                </span>
            </div>
            <div className={cl("header-center")}>
                <div className={cl("nav-buttons")}>
                    <button className={cl("nav-btn")} onClick={() => setCurrentDate(shiftDate(currentDate, view, -1))}>
                        <ChevronLeftIcon />
                    </button>
                    <button className={cl("nav-btn", "today-btn")} onClick={() => setCurrentDate(new Date())}>
                        Today
                    </button>
                    <button className={cl("nav-btn")} onClick={() => setCurrentDate(shiftDate(currentDate, view, 1))}>
                        <ChevronRightIcon />
                    </button>
                </div>
            </div>
            <div className={cl("header-right")}>
                <div className={cl("view-switcher")}>
                    {VIEWS.map(v => (
                        <button key={v} className={cl("view-btn", view === v && "active")} onClick={() => setView(v)}>
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <Modal {...modalProps} size="xxl" title={header}>
            <div className={cl("content")}>
                <div className={cl("sidebar")}>
                    <CalendarFilters
                        filters={filters}
                        counts={eventCounts}
                        onChange={setFilters}
                    />

                    <div className={cl("mini-calendar")}>
                        <MiniCalendar
                            currentDate={currentDate}
                            onDateSelect={setCurrentDate}
                            eventsByDay={eventsByDay}
                        />
                    </div>

                    <div className={cl("upcoming-events")}>
                        <h3 className={cl("section-title")}>Upcoming Events</h3>
                        <div className={cl("events-list")}>
                            {getUpcomingEvents(filteredEvents, UPCOMING_LIMIT).map(event => (
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
                    {loading ? (
                        <div className={cl("loading")}>
                            <div className={cl("spinner")} />
                            <span>Loading events...</span>
                        </div>
                    ) : error ? (
                        <div className={cl("error")}>
                            <span>{error}</span>
                            <button onClick={() => setError(null)}>Dismiss</button>
                        </div>
                    ) : (
                        <CalendarGrid
                            view={view}
                            currentDate={currentDate}
                            events={filteredEvents}
                            eventsByDay={eventsByDay}
                            onSelectEvent={selectEvent}
                        />
                    )}
                </div>

                {selectedEvent && (
                    <EventDetails
                        event={selectedEvent}
                        onClose={() => selectEvent(null)}
                        onInterestChange={interested => changeInterest(selectedEvent, interested)}
                    />
                )}
            </div>
        </Modal>
    );
}

// Mini calendar component for sidebar
function MiniCalendar({ currentDate, onDateSelect, eventsByDay }: {
    currentDate: Date;
    onDateSelect: (date: Date) => void;
    eventsByDay: EventsByDay;
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
                        const hasEvents = eventsByDay.has(dayKey(day));

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

function getUpcomingEvents(events: CalendarEvent[], limit: number) {
    const now = new Date();
    return events.filter(e => e.startTime >= now).slice(0, limit);
}

