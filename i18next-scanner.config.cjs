module.exports = {
  input: [
    'web/src/**/*.{ts,tsx,js,jsx}',
    '!web/src/**/*.test.{ts,tsx}',
    '!**/node_modules/**',
  ],
  output: './',
  options: {
    debug: false,
    removeUnusedKeys: false,
    sort: true,
    func: {
      list: ['t', 'i18n.t'],
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    lngs: ['en', 'es', 'pt', 'ru'],
    defaultLng: 'en',
    defaultValue: '__MISSING__',
    resource: {
      loadPath:  'web/src/locales/{{lng}}.json',
      savePath:  'web/src/locales/{{lng}}.json',
      jsonIndent: 2,
      lineEnding: '\n',
    },
    interpolation: {
      prefix: '{{',
      suffix: '}}',
    },
  },
};
