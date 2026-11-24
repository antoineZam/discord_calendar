/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import type { ComponentType, ReactNode } from "react";

import { CalendarEvent, CalendarView } from "../types";
import { addDays, formatLongDate, formatTime, formatTimeRange, getMonthWeeks, getWeekDays, HOUR_LABELS, HOUR_MS, isSameDay, WEEKDAY_NAMES } from "../utils/date";
import { sourceColor } from "../utils/sources";
import { EventCard } from "./EventCard";
import { CalendarIcon } from "./Icons";

const cl = classNameFactory("calendar-sync-");

const HOUR_HEIGHT = 48;
const MAX_PILLS_PER_DAY = 3;

interface ViewProps {
    currentDate: Date;
    events: CalendarEvent[];
    onSelectEvent: (event: CalendarEvent) => void;
}

const VIEWS: Record<CalendarView, ComponentType<ViewProps>> = {
    month: MonthView,
    week: WeekView,
    day: DayView,
    agenda: AgendaView,
};

export function CalendarGrid({ view, ...props }: ViewProps & { view: CalendarView; }) {
    const View = VIEWS[view] ?? MonthView;
    return <View {...props} />;
}

function MonthView({ currentDate, events, onSelectEvent }: ViewProps) {
    const today = new Date();

    return (
        <div className={cl("month-view")}>
            <div className={cl("month-header")}>
                {WEEKDAY_NAMES.long.map(name => (
                    <div key={name} className={cl("month-day-header")}>{name}</div>
                ))}
            </div>
            <div className={cl("month-grid")}>
                {getMonthWeeks(currentDate).map((week, wi) => (
                    <div key={wi} className={cl("month-week")}>
                        {week.map(day => {
                            const isToday = isSameDay(day, today);
                            const dayEvents = events.filter(e => isSameDay(e.startTime, day));

                            return (
                                <div
                                    key={day.getDay()}
                                    className={cl("month-day", day.getMonth() !== currentDate.getMonth() && "other-month", isToday && "today")}
                                >
                                    <div className={cl("day-number", isToday && "today")}>{day.getDate()}</div>
                                    <div className={cl("day-events")}>
                                        {dayEvents.slice(0, MAX_PILLS_PER_DAY).map(event => (
                                            <EventPill key={event.id} event={event} onClick={() => onSelectEvent(event)} />
                                        ))}
                                        {dayEvents.length > MAX_PILLS_PER_DAY && (
                                            <span className={cl("more-events")}>+{dayEvents.length - MAX_PILLS_PER_DAY} more</span>
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

function WeekView({ currentDate, events, onSelectEvent }: ViewProps) {
    const days = getWeekDays(currentDate);
    const today = new Date();

    return (
        <div className={cl("week-view")}>
            <div className={cl("week-header")}>
                <div className={cl("time-gutter")} />
                {days.map(day => (
                    <div key={day.getDay()} className={cl("week-day-header", isSameDay(day, today) && "today")}>
                        <span className={cl("day-name")}>{WEEKDAY_NAMES.short[day.getDay()]}</span>
                        <span className={cl("day-number", isSameDay(day, today) && "today")}>{day.getDate()}</span>
                    </div>
                ))}
            </div>
            <div className={cl("week-grid")}>
                <TimeColumn />
                <div className={cl("week-days")}>
                    {days.map(day => (
                        <div key={day.getDay()} className={cl("week-day-column")}>
                            <HourCells />
                            {events.filter(e => isSameDay(e.startTime, day)).map(event => (
                                <TimedEvent key={event.id} event={event} className="week-event-block" minHeight={24} onClick={() => onSelectEvent(event)}>
                                    <span className={cl("event-block-time")}>{formatTime(event.startTime)}</span>
                                    <span className={cl("event-block-title")}>{event.title}</span>
                                </TimedEvent>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function DayView({ currentDate, events, onSelectEvent }: ViewProps) {
    const isToday = isSameDay(currentDate, new Date());

    return (
        <div className={cl("day-view")}>
            <div className={cl("day-header")}>
                <h2 className={cl("day-title", isToday && "today")}>{formatLongDate(currentDate)}</h2>
                {isToday && <span className={cl("today-badge")}>Today</span>}
            </div>
            <div className={cl("day-grid")}>
                <TimeColumn />
                <div className={cl("day-events-column")}>
                    <HourCells />
                    {events.filter(e => isSameDay(e.startTime, currentDate)).map(event => (
                        <TimedEvent key={event.id} event={event} className="day-event-block" minHeight={32} onClick={() => onSelectEvent(event)}>
                            <div className={cl("event-block-content")}>
                                <span className={cl("event-block-title")}>{event.title}</span>
                                <span className={cl("event-block-time")}>{formatTimeRange(event.startTime, event.endTime)}</span>
                                {event.location && <span className={cl("event-block-location")}>{event.location}</span>}
                            </div>
                        </TimedEvent>
                    ))}
                </div>
            </div>
        </div>
    );
}

function AgendaView({ currentDate, events, onSelectEvent }: ViewProps) {
    const upcoming = events
        .filter(e => e.startTime >= currentDate)
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    if (!upcoming.length) {
        return (
            <div className={cl("agenda-view")}>
                <div className={cl("no-events")}>
                    <CalendarIcon size={48} />
                    <p>No upcoming events</p>
                </div>
            </div>
        );
    }

    const days = new Map<string, CalendarEvent[]>();
    for (const event of upcoming) {
        const key = event.startTime.toDateString();
        const group = days.get(key);
        if (group) group.push(event);
        else days.set(key, [event]);
    }

    const today = new Date();
    const tomorrow = addDays(today, 1);

    return (
        <div className={cl("agenda-view")}>
            {[...days].map(([key, dayEvents]) => {
                const date = dayEvents[0].startTime;
                const isToday = isSameDay(date, today);
                const prefix = isToday ? "Today · " : isSameDay(date, tomorrow) ? "Tomorrow · " : "";

                return (
                    <div key={key} className={cl("agenda-day")}>
                        <div className={cl("agenda-date", isToday && "today")}>{prefix + formatLongDate(date)}</div>
                        <div className={cl("agenda-events")}>
                            {dayEvents.map(event => (
                                <EventCard key={event.id} event={event} onClick={() => onSelectEvent(event)} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function TimeColumn() {
    return (
        <div className={cl("time-column")}>
            {HOUR_LABELS.map((label, hour) => (
                <div key={hour} className={cl("time-slot")}>
                    <span className={cl("time-label")}>{label}</span>
                </div>
            ))}
        </div>
    );
}

function HourCells() {
    return <>{HOUR_LABELS.map((_, hour) => <div key={hour} className={cl("hour-cell")} />)}</>;
}

function EventPill({ event, onClick }: { event: CalendarEvent; onClick: () => void; }) {
    return (
        <button className={cl("event-pill", event.status === "pending" && "pending")} style={sourceColor(event.source)} onClick={onClick}>
            <span className={cl("event-pill-dot")} />
            <span className={cl("event-pill-title")}>{event.title}</span>
        </button>
    );
}

/** An event positioned on the hour grid according to its start time and duration. */
function TimedEvent({ event, className, minHeight, onClick, children }: {
    event: CalendarEvent;
    className: string;
    minHeight: number;
    onClick: () => void;
    children: ReactNode;
}) {
    const { startTime, endTime } = event;
    const startHours = startTime.getHours() + startTime.getMinutes() / 60;
    const durationHours = (endTime.getTime() - startTime.getTime()) / HOUR_MS;

    return (
        <button
            className={cl(className, event.status === "pending" && "pending")}
            style={{ top: startHours * HOUR_HEIGHT, height: Math.max(durationHours * HOUR_HEIGHT, minHeight), ...sourceColor(event.source) }}
            onClick={onClick}
        >
            {children}
        </button>
    );
}
