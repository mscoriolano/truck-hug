import { test, expect } from 'bun:test';
import { parseDescriptions } from './descriptions';
test('RequestDescricaoAlertas maps actual tdeID names without guessing event codes', () => {
  const catalog = parseDescriptions('<ResponseDescricaoAlertas><DescricaoAlertas><tdeID>4</tdeID><Descricao>Inércia &amp; Banguela</Descricao></DescricaoAlertas><DescricaoAlertas><tdeID>17</tdeID><Descricao><![CDATA[Aceleração Brusca (RPM)]]></Descricao></DescricaoAlertas></ResponseDescricaoAlertas>');
  expect(catalog.get('4')).toBe('Inércia & Banguela'); expect(catalog.get('17')).toBe('Aceleração Brusca (RPM)'); expect(catalog.has('99')).toBe(false);
});