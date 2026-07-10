import { CalendarIcon } from 'lucide-react';
import React from 'react';
import {
    DatePicker as AriaDatePicker
} from 'react-aria-components/DatePicker';
import { Calendar } from './Calendar';
import { DateInput } from './DateField';
import { Description, FieldError, FieldGroup, Label } from './Field';
import { Popover } from './Popover';
import { composeTailwindRenderProps } from './utils';
import { FieldButton } from './FieldButton';

export function DatePicker({
    label,
    description,
    errorMessage,
    ...props
}) {
    return (
        <AriaDatePicker
            {...props}
            className={composeTailwindRenderProps(
                props.className,
                'group flex flex-col gap-1 w-full font-sans'
            )}>
            {label && <Label>{label}</Label>}
            <FieldGroup className="min-w-[208px] w-full cursor-text disabled:cursor-default">
                <DateInput className="border-0 rounded-none bg-transparent flex-1 min-w-[150px] pl-10 text-sm h-full py-0" />
                <FieldButton className="w-6 mr-1 outline-offset-0">
                    <CalendarIcon aria-hidden className="w-4 h-4" />
                </FieldButton>
            </FieldGroup>
            {description && <Description>{description}</Description>}
            <FieldError>{errorMessage}</FieldError>
            <Popover className="p-2">
                <Calendar />
            </Popover>
        </AriaDatePicker>
    );
}
