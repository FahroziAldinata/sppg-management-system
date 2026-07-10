import { ChevronDown } from 'lucide-react';
import React from 'react';
import {
    ComboBox as AriaComboBox,
    ComboBoxValue,
    ListBox
} from 'react-aria-components/ComboBox';
import { Description, FieldError, FieldGroup, Input, Label } from './Field';
import { DropdownItem, DropdownSection } from './ListBox';
import { Popover } from './Popover';
import { composeTailwindRenderProps } from './utils';
import { FieldButton } from './FieldButton';

export function ComboBox({
    label,
    description,
    errorMessage,
    children,
    items,
    ...props
}) {
    return (
        <AriaComboBox
            {...props}
            className={composeTailwindRenderProps(
                props.className,
                'group flex flex-col gap-1 w-full font-sans'
            )}>
            <Label>{label}</Label>
            <FieldGroup>
                <Input className="pl-10 pr-1 border-0 bg-transparent h-full py-0" />
                <FieldButton className="w-6 mr-1 outline-offset-0">
                    <ChevronDown aria-hidden className="w-4 h-4" />
                </FieldButton>
            </FieldGroup>
            {props.selectionMode === 'multiple' && (
                <ComboBoxValue
                    placeholder="No items selected"
                    className="text-xs text-neutral-600 dark:text-neutral-300"
                />
            )}
            {description && <Description>{description}</Description>}
            <FieldError>{errorMessage}</FieldError>
            <Popover className="w-(--trigger-width)">
                <ListBox
                    items={items}
                    className="outline-0 p-1 box-border max-h-[inherit] overflow-auto [clip-path:inset(0_0_0_0_round_.75rem)]">
                    {children}
                </ListBox>
            </Popover>
        </AriaComboBox>
    );
}

export function ComboBoxItem(props) {
    return <DropdownItem {...props} />;
}

export function ComboBoxSection(props) {
    return <DropdownSection {...props} />;
}
