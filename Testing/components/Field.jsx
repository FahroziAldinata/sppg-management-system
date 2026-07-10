'use client';
import React from 'react';
import { FieldError as RACFieldError } from 'react-aria-components/FieldError';
import { Group } from 'react-aria-components/Group';
import { Input as RACInput } from 'react-aria-components/Input';
import { Label as RACLabel } from 'react-aria-components/Label';
import { Text } from 'react-aria-components/Text';
import { composeRenderProps } from 'react-aria-components/composeRenderProps';
import { twMerge } from 'tailwind-merge';
import { tv } from 'tailwind-variants';
import { composeTailwindRenderProps, focusRing } from './utils';

export function Label(props) {
  return (
    <RACLabel
      {...props}
      className={twMerge(
        'font-sans text-sm text-neutral-600 dark:text-neutral-300 font-medium cursor-default w-fit',
        props.className
      )}
    />
  );
}

export function Description(props) {
  return (
    <Text
      {...props}
      slot="description"
      className={twMerge(
        'text-xs text-neutral-600 dark:text-neutral-400 group-disabled:text-neutral-200 dark:group-disabled:text-neutral-700 contain-inline-size',
        props.className
      )}
    />
  );
}

export function FieldError(props) {
  return (
    <RACFieldError
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        'text-xs text-red-600 contain-inline-size forced-colors:text-[Mark]'
      )}
    />
  );
}

export const fieldBorderStyles = tv({
  base: 'transition',
  variants: {
    isFocusWithin: {
      false:
        'border-[var(--input-border)] hover:border-[var(--input-hover-border)] forced-colors:border-[ButtonBorder]',
      true: 'border-[var(--input-focus-border)] ring-3 ring-[var(--input-focus-shadow)] outline-none'
    },
    isInvalid: {
      true: 'border-red-600 dark:border-red-600 forced-colors:border-[Mark]'
    },
    isDisabled: {
      true: 'border-neutral-200 dark:border-neutral-700 forced-colors:border-[GrayText] opacity-50'
    }
  }
});

export const fieldGroupStyles = tv({
  extend: focusRing,
  base: 'group flex items-center h-[42px] w-full box-border bg-[var(--bg)] border rounded-[var(--radius-sm)] overflow-hidden transition',
  variants: fieldBorderStyles.variants
});

export function FieldGroup(props) {
  return (
    <Group
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        fieldGroupStyles({...renderProps, className})
      )}
    />
  );
}

export function Input(props) {
  return (
    <RACInput
      {...props}
      data-slot="input"
      className={composeTailwindRenderProps(
        props.className,
        'pl-10 pr-3 py-2.5 h-[42px] flex-1 min-w-0 border-0 outline outline-0 bg-[var(--bg)] font-sans text-sm text-[var(--text)] placeholder:text-neutral-600 dark:placeholder:text-neutral-400 disabled:text-neutral-200 dark:disabled:text-neutral-600 disabled:placeholder:text-neutral-200 dark:disabled:placeholder:text-neutral-600 [-webkit-tap-highlight-color:transparent]'
      )}
    />
  );
}
