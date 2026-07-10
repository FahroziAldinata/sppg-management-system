import { RangeCalendar } from "@heroui/react";

export default function TestRangeCalendar() {
    return (
        <div style={{ padding: 40 }}>
            <h1>HeroUI RangeCalendar Test</h1>

            <RangeCalendar aria-label="Rentang Periode">
                <RangeCalendar.Header>
                    <RangeCalendar.NavButton slot="previous" />
                    <RangeCalendar.Heading />
                    <RangeCalendar.NavButton slot="next" />
                </RangeCalendar.Header>

                <RangeCalendar.Grid>
                    <RangeCalendar.GridHeader>
                        {(day) => (
                            <RangeCalendar.HeaderCell>
                                {day}
                            </RangeCalendar.HeaderCell>
                        )}
                    </RangeCalendar.GridHeader>

                    <RangeCalendar.GridBody>
                        {(date) => (
                            <RangeCalendar.Cell date={date} />
                        )}
                    </RangeCalendar.GridBody>
                </RangeCalendar.Grid>
            </RangeCalendar>
        </div>
    );
}