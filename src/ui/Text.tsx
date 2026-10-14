import { Text as RNText, type TextProps } from 'react-native';
import { colors, fonts } from './theme';

type Weight = 'regular' | 'bold' | 'black';

export function Text({ style, weight = 'regular', ...rest }: TextProps & { weight?: Weight }) {
  return <RNText {...rest} style={[{ fontFamily: fonts[weight], color: colors.ink, fontSize: 16 }, style]} />;
}

// Gujarati script. Noto Sans Gujarati is bundled so it renders the same on
// every device; system Gujarati fonts vary a lot in how they draw conjuncts.
export function Gu({ style, bold, ...rest }: TextProps & { bold?: boolean }) {
  return (
    <RNText
      {...rest}
      style={[{ fontFamily: bold ? fonts.guBold : fonts.gu, color: colors.ink, fontSize: 18 }, style]}
    />
  );
}
