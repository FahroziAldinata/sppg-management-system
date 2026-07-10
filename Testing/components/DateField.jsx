import React from 'react';
import {
    DateField as AriaDateField,
    DateInput as AriaDateInput,
    DateSegment
} from 'react-aria-components/DateField';
import { tv } from 'tailwind-variants';
import { Description, FieldError, Label, fieldGroupStyles } from './Field';
import { composeTailwindRenderProps } from './utils';
import { twMerge } from 'tailwind-merge';

export function DateField({
    label,
    description,
    errorMessage,
    ...props
}) {
    return (
        <AriaDateField
            {...props}
            className={composeTailwindRenderProps(props.className, 'flex flex-col gap-1 w-full')}>
            {label && <Label>{label}</Label>}
            <DateInput />
            {description && <Description>{description}</Description>}
            <FieldError>{errorMessage}</FieldError>
        </AriaDateField>
    );
}

const segmentStyles = tv({
    base: 'inline p-0.5 whitespace-nowrap type-literal:p-0 rounded-xs outline outline-0 forced-color-adjust-none caret-transparent text-neutral-800 dark:text-neutral-200 forced-colors:text-[ButtonText] [-webkit-tap-highlight-color:transparent]',
    variants: {
        isPlaceholder: {
            true: 'text-neutral-600 dark:text-neutral-400'
        },
        isDisabled: {
            true: 'text-neutral-200 dark:text-neutral-600 forced-colors:text-[GrayText]'
        },
        isFocused: {
            true: 'bg-[var(--input-hover-border)] text-white dark:text-white forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]'
        }
    }
});

export function DateInput({ className, ...props }) {
    return (
        <AriaDateInput
            className={renderProps =>
                fieldGroupStyles({
                    ...renderProps,
                    class: twMerge(
                        'inline flex items-center w-full min-w-[150px] pl-10 pr-3 py-2.5 h-[42px] text-sm leading-normal font-sans cursor-text disabled:cursor-default whitespace-nowrap overflow-x-auto [scrollbar-width:none]',
                        className
                    )
                })
            }
            {...props}>
            {segment => <DateSegment segment={segment} className={segmentStyles} />}
        </AriaDateInput>
    );
}
