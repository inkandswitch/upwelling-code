# Upwelling

[Demo](https://upwelling.vercel.app/)

## Setup 

Get on Node v16. We recommend you use nvm. To install:

```
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
```

Then, to install and use 16

```
nvm install 16
nvm use 16
```

To set 16 as the default, do

```
nvm alias default 16
```

## Development

```
npm run build
```

or, to watch as you edit the files:

```
npm run watch
```

## Release

To package it up into a js bundle for release:

```
npm run release
```