import {composeRenderProps} from 'react-aria-components/composeRenderProps';
import {twMerge} from 'tailwind-merge';
import {tv} from 'tailwind-variants';

export const focusRing = tv({
  base: 'outline-none',
  variants: {
    isFocusVisible: {
      false: '',
      true: 'ring-3 ring-[var(--input-focus-shadow)]'
    }
  }
});

export function composeTailwindRenderProps(className, tw) {
  return composeRenderProps(className, className => twMerge(tw, className));
}
