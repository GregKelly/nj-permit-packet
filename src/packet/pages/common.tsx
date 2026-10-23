// Shared look for our own pages: US Letter, Helvetica (built into every PDF
// reader, so nothing is embedded and the output is byte-for-byte repeatable).

import { Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';

// Never break words with hyphens: names, addresses and code citations must read exactly.
Font.registerHyphenationCallback((word) => [word]);

export const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 44, paddingHorizontal: 44, fontFamily: 'Helvetica', fontSize: 9, lineHeight: 1.3, color: '#111' },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 15, lineHeight: 1.2, marginBottom: 3 },
  subtitle: { fontSize: 9.5, color: '#444', marginBottom: 8 },
  h2: { fontFamily: 'Helvetica-Bold', fontSize: 10.5, marginTop: 9, marginBottom: 3 },
  bold: { fontFamily: 'Helvetica-Bold' },
  muted: { color: '#555' },
  small: { fontSize: 7.5, lineHeight: 1.25 },
  banner: { borderWidth: 1, borderColor: '#111', padding: 5, marginBottom: 6, fontFamily: 'Helvetica-Bold' },
  warning: { borderWidth: 2, borderColor: '#b00020', padding: 8, marginBottom: 10 },
  warningTitle: { fontFamily: 'Helvetica-Bold', color: '#b00020', marginBottom: 2 },
  row: { flexDirection: 'row' },
  bullet: { width: 14 },
  num: { width: 18, fontFamily: 'Helvetica-Bold' },
  grow: { flex: 1 },
  table: { borderTopWidth: 0.75, borderColor: '#999' },
  tr: { flexDirection: 'row', borderBottomWidth: 0.75, borderColor: '#999', paddingVertical: 2 },
  th: { fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 20, left: 44, right: 44, fontSize: 7.5, color: '#555' },
  signLine: { borderBottomWidth: 0.75, borderColor: '#111', height: 26, marginBottom: 2 },
});

/** One page (or more, if the content runs over) with the traceability footer. */
export function Sheet({ children, footer }: { children: ReactNode; footer: string }) {
  return (
    <Page size="LETTER" style={s.page}>
      {children}
      <Text style={s.footer} fixed>
        {footer}
      </Text>
    </Page>
  );
}

export function Bullet({ children, mark = '•' }: { children: ReactNode; mark?: string }) {
  return (
    <View style={s.row} wrap={false}>
      <Text style={s.bullet}>{mark}</Text>
      <Text style={s.grow}>{children}</Text>
    </View>
  );
}

export function Numbered({ n, children }: { n: number; children: ReactNode }) {
  return (
    <View style={[s.row, { marginBottom: 2 }]} wrap={false}>
      <Text style={s.num}>{n}.</Text>
      <View style={s.grow}>{children}</View>
    </View>
  );
}

export function footerText(prepared: string, rulesVersion: string): string {
  return `Prepared ${prepared} · Rules version ${rulesVersion} · Permit Packet`;
}
