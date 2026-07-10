import React from 'react';
import {
    TextField as AriaTextField
} from 'react-aria-components/TextField';
import { tv } from 'tailwind-variants';
import { Description, FieldError, Input, Label, fieldBorderStyles } from './Field';
import { composeTailwindRenderProps, focusRing } from './utils';

const inputStyles = tv({
    extend: focusRing,
    base: 'border border-[var(--input-border)] hover:border-[var(--input-hover-border)] rounded-[var(--radius-sm)] h-[42px] w-full font-sans text-sm py-2.5 pl-10 pr-3 bg-[var(--bg)] box-border transition',
    variants: {
        isFocused: {
            true: 'border-[var(--input-focus-border)] ring-3 ring-[var(--input-focus-shadow)] outline-none'
        },
        isInvalid: fieldBorderStyles.variants.isInvalid,
        isDisabled: fieldBorderStyles.variants.isDisabled
    }
});

export function TextField({ label, description, errorMessage, ...props }) {
    return (
        <AriaTextField
            {...props}
            className={composeTailwindRenderProps(props.className, 'flex flex-col gap-1 w-full font-sans')}>
            {label && <Label>{label}</Label>}
            <Input className={inputStyles} />
            {description && <Description>{description}</Description>}
            <FieldError>{errorMessage}</FieldError>
        </AriaTextField>
    );
}
