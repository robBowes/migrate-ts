import { mockPluginParams } from '../test-utils';
import eslintFixPlugin from '../../src/ts-migrate-plugins/plugins/eslint-fix';

describe('eslint-fix plugin', () => {
  it('handles eslint semicolon', async () => {
    const text = `const hello = 'world'`;
    const result = await eslintFixPlugin.run(mockPluginParams({ text, fileName: 'Foo.tsx' }));

    const expected = `const hello = 'world'`;
    expect(result).toBe(expected);
  });
});
