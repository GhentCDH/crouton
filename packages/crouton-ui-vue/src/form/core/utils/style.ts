import type { ControlProperties } from '../properties';

type StyleControlProperties = Pick<
  ControlProperties,
  'errors' | 'isTouched' | 'size'
>;

export const showErrors = ({ isTouched, errors }: StyleControlProperties) => {
  return !!(isTouched && errors);
};

export const isDescriptionHidden = (
  visible: boolean,
  description: string | undefined,
  isFocused: boolean,
  showUnfocusedDescription: boolean,
): boolean => {
  return (
    description === undefined ||
    (description !== undefined && !visible) ||
    (!showUnfocusedDescription && !isFocused)
  );
};

export const buildInputStyle = (
  styles: string,
  properties: StyleControlProperties,
): any => {
  return [
    styles,
    {
      'input-sm': properties.size === 'sm',
      'input-error': showErrors(properties),
    },
  ];
};
