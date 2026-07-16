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

export const generateDateRange = (tanggalMulai, tanggalSelesai) => {
  if (!tanggalMulai || !tanggalSelesai) return [];
  const start = new Date(tanggalMulai);
  const end = new Date(tanggalSelesai);
  const dates = [];
  let current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};
