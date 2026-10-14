import type { StyleProp, TextStyle } from 'react-native';
import { Text } from './Text';
import { fonts } from './theme';

const GU_RUN = /([઀-૿]+(?:[\s઀-૿]*[઀-૿])?)/g;
const HAS_GU = /[઀-૿]/;

// A paragraph with **bold** spans, where any Gujarati switches to the
// Gujarati font (Nunito has no Gujarati letters, and the system fallback
// draws joined letters badly).
export function Rich({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text style={style}>
      {parts.map((p, i) => {
        const bold = p.startsWith('**') && p.endsWith('**');
        const body = bold ? p.slice(2, -2) : p;
        return (
          <Text key={i} weight={bold ? 'black' : undefined} style={style}>
            {body.split(GU_RUN).map((run, j) =>
              HAS_GU.test(run) ? (
                <Text key={j} style={[style, { fontFamily: bold ? fonts.guBold : fonts.gu }]}>
                  {run}
                </Text>
              ) : (
                run
              ),
            )}
          </Text>
        );
      })}
    </Text>
  );
}
