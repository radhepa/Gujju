import { Platform } from 'react-native';

export const colors = {
  bg: '#FBF6EE',
  card: '#FFFFFF',
  ink: '#2A2420',
  muted: '#74685F',
  // Darker grey for text on tinted fills, where muted is too faint.
  inkSoft: '#5E534B',
  line: '#E9E0D4',
  lineDark: '#D6CABB',
  primary: '#E58E26',
  primaryDark: '#B96A12',
  primarySoft: '#FCEBD3',
  // Deep enough to carry white text (unit bands).
  primaryDeep: '#B05F0C',
  green: '#3E9B5B',
  greenDark: '#2C7443',
  greenSoft: '#E2F3E7',
  red: '#D2483F',
  redDark: '#A3332C',
  redSoft: '#FBE6E3',
  teal: '#1E6F75',
  tealSoft: '#DDEFEF',
  locked: '#CEC4B8',
};

export const fonts = {
  regular: 'Nunito_400Regular',
  bold: 'Nunito_700Bold',
  black: 'Nunito_800ExtraBold',
  gu: 'NotoSansGujarati_400Regular',
  guBold: 'NotoSansGujarati_700Bold',
};

export const maxWidth = 560;

export const shadow = Platform.select({
  web: { boxShadow: '0 1px 2px rgba(42,36,32,0.06)' },
  default: {
    shadowColor: '#2A2420',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
});
