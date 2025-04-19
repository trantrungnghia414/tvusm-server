Tạo project NestSJ

npm i -g @nestjs/cli
nest new project-name

---

Thêm prettier để hết lỗi CRLF trong eslint
rules: {
'prettier/prettier': ['error', { endOfLine: 'auto' }],
},

---

Đổi warn thành error để hết báo đỏ cảnh báo trong eslint
rules: {
'@typescript-eslint/no-unsafe-argument': 'error',
},

---

Cài Hot Reload

npm i --save-dev webpack-node-externals run-script-webpack-plugin webpack

Tạo webpack-hmr.config.js ở thư mục root và sửa chổ autoRestart: thành true

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
new RunScriptWebpackPlugin({ name: options.output.filename, autoRestart: true }),
],
};
};

Và thêm vào main.ts

declare const module: any;

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
const app = await NestFactory.create(AppModule);
await app.listen(process.env.PORT ?? 3000);

if (module.hot) {
module.hot.accept();
module.hot.dispose(() => app.close());
}
}
bootstrap();

---

Trong package.json

"start:dev": "nest build --webpack --webpackPath webpack-hmr.config.js --watch"

---
