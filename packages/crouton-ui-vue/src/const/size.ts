export type Size = 'xs' | 'sm' | 'lg' | 'xl';

// Dictionary of Modal size classes
export const ModalSize: Record<Size, string> = {
  xs: 'max-w-xs w-[50VW]',
  sm: 'max-w-sm w-[50VW]',
  lg: 'max-w-2xl w-[80VW]',
  xl: 'max-w-[80VW] w-[80VW]',
};

// Dictionary of button size classes
export const ButtonSize: Record<Size, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  lg: 'btn-sm',
  xl: 'btn',
};

// Dictionary of Badge size classes
export const BadgeSize: Record<Size, string> = {
  xs: 'badge-xs text-xxs',
  sm: 'badge-sm text-xs',
  lg: 'badge-sm text-xs',
  xl: 'badge text-xs',
};
