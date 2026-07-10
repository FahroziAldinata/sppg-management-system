import React from 'react';
import { composeRenderProps } from 'react-aria-components/composeRenderProps';
import {
    Button as RACButton
} from 'react-aria-components/Button';
import { tv } from 'tailwind-variants';
import { focusRing } from './utils';

let button = tv({
    extend: focusRing,
    base: 'relative inline-flex items-center justify-center gap-2 border border-transparent dark:border-white/10 box-border [&:has(>svg:only-child)]:px-0 [&:has(>svg:only-child)]:h-8 [&:has(>svg:only-child)]:w-8 font-sans text-sm font-semibold text-center transition rounded-[var(--radius-sm)] cursor-default [-webkit-tap-highlight-color:transparent]',
    variants: {
        variant: {
            primary: 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-semibold border-none hover:opacity-90 pressed:opacity-75 py-3 px-6',
            secondary:
                'border-[var(--border)] bg-[var(--bg-elevated)] hover:bg-[var(--bg)] pressed:opacity-80 text-[var(--text)] py-3 px-6',
            destructive: 'bg-[var(--color-danger)] hover:opacity-90 pressed:opacity-80 text-white py-3 px-6',
            quiet:
                'border-0 bg-transparent hover:bg-black/[5%] dark:hover:bg-white/10 pressed:bg-black/10 dark:pressed:bg-white/20 text-[var(--text)] py-1.5 px-3'
        },
        isDisabled: {
            true: 'border-transparent dark:border-transparent bg-neutral-100 dark:bg-neutral-800 text-neutral-300 dark:text-neutral-600 forced-colors:text-[GrayText]'
        },
        isPending: {
            true: 'text-transparent'
        }
    },
    defaultVariants: {
        variant: 'primary'
    },
    compoundVariants: [
        {
            variant: 'quiet',
            isDisabled: true,
            class: 'bg-transparent dark:bg-transparent'
        }
    ]
});

export function Button(props) {
    return (
        <RACButton
            {...props}
            className={composeRenderProps(props.className, (className, renderProps) =>
                button({ ...renderProps, variant: props.variant || 'primary', className })
            )}>
            {composeRenderProps(props.children, (children, { isPending }) => (
                <>
                    {children}
                    {isPending && (
                        <span aria-hidden className="flex absolute inset-0 justify-center items-center">
                            <svg
                                className="w-4 h-4 text-white animate-spin"
                                viewBox="0 0 24 24"
                                stroke={
                                    props.variant === 'secondary' || props.variant === 'quiet'
                                        ? 'light-dark(black, white)'
                                        : 'white'
                                }>
                                <circle cx="12" cy="12" r="10" strokeWidth="4" fill="none" className="opacity-25" />
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    fill="none"
                                    pathLength="100"
                                    strokeDasharray="60 140"
                                    strokeDashoffset="0"
                                />
                            </svg>
                        </span>
                    )}
                </>
            ))}
        </RACButton>
    );
}
