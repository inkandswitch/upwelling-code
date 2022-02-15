# Upwelling

[Demo](https://upwelling.vercel.app/)

## Step 0: Get on Node v16, yarn, and Rust

We recommend you use nvm. To install:

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

# Testing upwelling

```
npm test
```

# Building API

```
cd api
npm run build
```

# Starting App

```
cd app
npm start
```
