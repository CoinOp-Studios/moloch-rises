# Moloch Rises

## Testnet contract deployments

Board: https://mumbai.polygonscan.com/address/0x4bdd237de99fa5c92e197cfd0077ffb4069b4dba#code

Loot: https://mumbai.polygonscan.com/address/0x8fb0bf5cf1f7e1287253b7ad9671c6fa36ea21b1#code

Avatar: https://mumbai.polygonscan.com/address/0x2eaf87e63115070fbad8e5e9cd7bb25c2e1351a0#code


# Phaser 3 Webpack Project Template

A Phaser 3 project template with ES6 support via [Babel 7](https://babeljs.io/) and [Webpack 4](https://webpack.js.org/) that includes hot-reloading for development and production-ready builds.

This has been updated for Phaser 3.50.0 version and above.

Loading images via JavaScript module `import` is also supported, although not recommended.

## Requirements

[Node.js](https://nodejs.org) is required to install dependencies and run scripts via `npm`.

## Available Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install project dependencies |
| `npm start` | Build project and open web server running project |
| `npm run build` | Builds code bundle with production settings (minification, uglification, etc..) |

## Writing Code
# Phaser Wallet

Just the simplest implementation of Web3Modal using PhaserIO libraries.

## Building

I prefer the PNPM tool these days, so:

```
pnpm install
pnpm start
```

## Deploying Code

After you run the `pnpm run build` command, your code will be built into a single bundle located at `dist/bundle.min.js` along with any other assets you project depended. 

If you put the contents of the `dist` folder in a publicly-accessible location (say something like `http://mycoolserver.com`), you should be able to open `http://mycoolserver.com/index.html` and play your game.
