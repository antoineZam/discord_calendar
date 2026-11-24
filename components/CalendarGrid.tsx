/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";

import { CalendarEvent, CalendarView } from "../types";
import { addDays, formatLongDate, formatTime, formatTimeRange, getMonthWeeks, getWeekDays, HOUR_LABELS, HOUR_MS, isSameDay, WEEKDAY_NAMES } from "../utils/date";
import { sourceColor } from "../utils/sources";
import { EventCard } from "./EventCard";
import { CalendarIcon } from "./Icons";

const cl = classNameFactory("calendar-sync-");

interface CalendarGridProps {
    view: CalendarView;
    currentDate: Date;
    events: CalendarEvent[];
    selectedEvent: CalendarEvent | null;
    onSelectEvent: (event: CalendarEvent | null) => void;
}

export function CalendarGrid({ view, currentDate, events, selectedEvent, onSelectEvent }: CalendarGridProps) {
    switch (view) {
        case "month":
            return <MonthView currentDate={currentDate} events={events} onSelectEvent={onSelectEvent} />;
        case "week":
            return <WeekView currentDate={currentDate} events={events} onSelectEvent={onSelectEvent} />;
        case "day":
            return <DayView currentDate={currentDate} events={events} onSelectEvent={onSelectEvent} />;
        case "agenda":
            return <AgendaView currentDate={currentDate} events={events} onSelectEvent={onSelectEvent} />;
        default:
            return <MonthView currentDate={currentDate} events={events} onSelectEvent={onSelectEvent} />;
    }
}

// Month View Component
function MonthView({
    currentDate,
    events,
    onSelectEvent
}: {
    currentDate: Date;
    events: CalendarEvent[];
    onSelectEvent: (event: CalendarEvent) => void;
}) {
    const weeks = getMonthWeeks(currentDate);
    const today = new Date();

    return (
        <div className={cl("month-view")}>
            <div className={cl("month-header")}>
                {WEEKDAY_NAMES.long.map(name => (
                    <div key={name} className={cl("month-day-header")}>{name}</div>
                ))}
            </div>
            <div className={cl("month-grid")}>
                {weeks.map((week, wi) => (
                    <div key={wi} className={cl("month-week")}>
                        {week.map((day, di) => {
                            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                            const isToday = isSameDay(day, today);
                            const dayEvents = events.filter(e => isSameDay(e.startTime, day));

                            return (
                                <div
                                    key={di}
                                    className={cl(
                                        "month-day",
                                        !isCurrentMonth && "other-month",
                                        isToday && "today"
                                    )}
                                >
                                    <div className={cl("day-number", isToday && "today")}>
                                        {day.getDate()}
                                    </div>
                                    <div className={cl("day-events")}>
                                        {dayEvents.slice(0, 3).map(event => (
                                            <EventPill
                                                key={event.id}
                                                event={event}
                                                onClick={() => onSelectEvent(event)}
                                            />
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <span className={cl("more-events")}>
                                                +{dayEvents.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Week View Component
function WeekView({
    currentDate,
    events,
    onSelectEvent
}: {
    currentDate: Date;
    events: CalendarEvent[];
    onSelectEvent: (event: CalendarEvent) => void;
}) {
    const days = getWeekDays(currentDate);
    const today = new Date();

    return (
        <div className={cl("week-view")}>
            <div className={cl("week-header")}>
                <div className={cl("time-gutter")} />
                {days.map((day, i) => (
                    <div
                        key={i}
                        className={cl("week-day-header", isSameDay(day, today) && "today")}
                    >
                        <span className={cl("day-name")}>
                            {WEEKDAY_NAMES.short[day.getDay()]}
                        </span>
                        <span className={cl("day-number", isSameDay(day, today) && "today")}>
                            {day.getDate()}
                        </span>
                    </div>
                ))}
            </div>
            <div className={cl("week-grid")}>
                <div className={cl("time-column")}>
                    {HOUR_LABELS.map(label => (
                        <div key={label} className={cl("time-slot")}>
                            <span className={cl("time-label")}>
                                {label}
                            </span>
                        </div>
                    ))}
                </div>
                <div className={cl("week-days")}>
                    {days.map((day, di) => (
                        <div key={di} className={cl("week-day-column")}>
                            {HOUR_LABELS.map(label => (
                                <div key={label} className={cl("hour-cell")} />
                            ))}
                            {/* Render events for this day */}
                            {events
                                .filter(e => isSameDay(e.startTime, day))
                                .map(event => (
                                    <WeekEventBlock
                                        key={event.id}
                                        event={event}
                                        onClick={() => onSelectEvent(event)}
                                    />
                                ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Day View Component
function DayView({
    currentDate,
    events,
    onSelectEvent
}: {
    currentDate: Date;
    events: CalendarEvent[];
    onSelectEvent: (event: CalendarEvent) => void;
}) {
    const dayEvents = events.filter(e => isSameDay(e.startTime, currentDate));
    const isToday = isSameDay(currentDate, new Date());

    return (
        <div className={cl("day-view")}>
            <div className={cl("day-header")}>
                <h2 className={cl("day-title", isToday && "today")}>
                    {formatLongDate(currentDate)}
                </h2>
                {isToday && <span className={cl("today-badge")}>Today</span>}
            </div>
            <div className={cl("day-grid")}>
                <div className={cl("time-column")}>
                    {HOUR_LABELS.map(label => (
                        <div key={label} className={cl("time-slot")}>
                            <span className={cl("time-label")}>
                                {label}
                            </span>
                        </div>
                    ))}
                </div>
                <div className={cl("day-events-column")}>
                    {HOUR_LABELS.map(label => (
                        <div key={label} className={cl("hour-cell")} />
                    ))}
                    {dayEvents.map(event => (
                        <DayEventBlock
                            key={event.id}
                            event={event}
                            onClick={() => onSelectEvent(event)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// Agenda View Component
function AgendaView({
    currentDate,
    events,
    onSelectEvent
}: {
    currentDate: Date;
    events: CalendarEvent[];
    onSelectEvent: (event: CalendarEvent) => void;
}) {
    const upcomingEvents = events
        .filter(e => e.startTime >= currentDate)
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Group events by date
    const groupedEvents: Map<string, CalendarEvent[]> = new Map();

    upcomingEvents.forEach(event => {
        const dateKey = event.startTime.toDateString();
        if (!groupedEvents.has(dateKey)) {
            groupedEvents.set(dateKey, []);
        }
        groupedEvents.get(dateKey)!.push(event);
    });

    const today = new Date();
    const tomorrow = addDays(today, 1);

    return (
        <div className={cl("agenda-view")}>
            {upcomingEvents.length === 0 ? (
                <div className={cl("no-events")}>
                    <CalendarIcon size={48} />
                    <p>No upcoming events</p>
                </div>
            ) : (
                Array.from(groupedEvents.entries()).map(([dateKey, dayEvents]) => {
                    const date = dayEvents[0].startTime;
                    const isToday = isSameDay(date, today);
                    const prefix = isToday ? "Today · " : isSameDay(date, tomorrow) ? "Tomorrow · " : "";

                    return (
                        <div key={dateKey} className={cl("agenda-day")}>
                            <div className={cl("agenda-date", isToday && "today")}>
                                {prefix + formatLongDate(date)}
                            </div>
                            <div className={cl("agenda-events")}>
                                {dayEvents.map(event => (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                        onClick={() => onSelectEvent(event)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}

// Event Pill for Month View
function EventPill({ event, onClick }: { event: CalendarEvent; onClick: () => void; }) {
    return (
        <button
            className={cl("event-pill", event.status === "pending" && "pending")}
            style={sourceColor(event.source)}
            onClick={onClick}
        >
            <span className={cl("event-pill-dot")} />
            <span className={cl("event-pill-title")}>{event.title}</span>
        </button>
    );
}

// Event Block for Week View
function WeekEventBlock({ event, onClick }: { event: CalendarEvent; onClick: () => void; }) {
    const { startTime, endTime } = event;

    const startHours = startTime.getHours() + startTime.getMinutes() / 60;
    const durationHours = (endTime.getTime() - startTime.getTime()) / HOUR_MS;

    const top = startHours * 48; // 48px per hour
    const height = Math.max(durationHours * 48, 24);

    return (
        <button
            className={cl("week-event-block", event.status === "pending" && "pending")}
            style={{ top: `${top}px`, height: `${height}px`, ...sourceColor(event.source) }}
            onClick={onClick}
        >
            <span className={cl("event-block-time")}>
                {formatTime(startTime)}
            </span>
            <span className={cl("event-block-title")}>{event.title}</span>
        </button>
    );
}

// Event Block for Day View
function DayEventBlock({ event, onClick }: { event: CalendarEvent; onClick: () => void; }) {
    const { startTime, endTime } = event;

    const startHours = startTime.getHours() + startTime.getMinutes() / 60;
    const durationHours = (endTime.getTime() - startTime.getTime()) / HOUR_MS;

    const top = startHours * 48;
    const height = Math.max(durationHours * 48, 32);

    return (
        <button
            className={cl("day-event-block", event.status === "pending" && "pending")}
            style={{ top: `${top}px`, height: `${height}px`, ...sourceColor(event.source) }}
            onClick={onClick}
        >
            <div className={cl("event-block-content")}>
                <span className={cl("event-block-title")}>{event.title}</span>
                <span className={cl("event-block-time")}>
                    {formatTimeRange(startTime, endTime)}
                </span>
                {event.location && (
                    <span className={cl("event-block-location")}>{event.location}</span>
                )}
            </div>
        </button>
    );
}
