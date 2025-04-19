# NestJS Project Setup Guide

## Initial Setup

Create a new NestJS project:

```bash
npm i -g @nestjs/cli
nest new project-name
```

## ESLint Configuration

### Fix CRLF Issues with Prettier

Add the following rule to your ESLint config:

```javascript
rules: {
  'prettier/prettier': ['error', { endOfLine: 'auto' }],
}
```

### Change Warnings to Errors

Update ESLint rules to convert warnings to errors:

```javascript
rules: {
  '@typescript-eslint/no-floating-promises': 'error'
  '@typescript-eslint/no-unsafe-argument': 'error',
}
```

## Hot Reload Configuration

### 1. Install Required Packages

```bash
npm i --save-dev webpack-node-externals run-script-webpack-plugin webpack
```

### 2. Create Webpack HMR Configuration

Create `webpack-hmr.config.js` in the root directory:

```javascript
const nodeExternals = require('webpack-node-externals');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');

module.exports = function (options, webpack) {
  return {
    ...options,
    entry: ['webpack/hot/poll?100', options.entry],
    externals: [
      nodeExternals({
        allowlist: ['webpack/hot/poll?100'],
      }),
    ],
    plugins: [
      ...options.plugins,
      new webpack.HotModuleReplacementPlugin(),
      new webpack.WatchIgnorePlugin({
        paths: [/\.js$/, /\.d\.ts$/],
      }),
      new RunScriptWebpackPlugin({
        name: options.output.filename,
        autoRestart: true,
      }),
    ],
  };
};
```

> **Note**: To fix the "not found" error from ESLint, add `webpack-hmr.config.js` to the `ignores` list in `eslint.config.mjs`:

```javascript
export default tseslint.config({
  ignores: ['eslint.config.mjs', 'webpack-hmr.config.js'], // Add webpack-hmr.config.js here
});
```

### 3. Update main.ts

Add the following code to your `main.ts`:

```typescript
declare const module: NodeModule & {
  hot?: {
    accept: () => void;
    dispose: (callback: () => void) => void;
  };
};

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => void app.close());
  }
}
bootstrap().catch((err) => {
  console.error('Error starting the application:', err);
});
```

### 4. Update package.json

Add the following script to your package.json:

```json
{
  "scripts": {
    "start:dev": "nest build --webpack --webpackPath webpack-hmr.config.js --watch"
  }
}
```
