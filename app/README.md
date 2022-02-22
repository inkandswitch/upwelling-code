# Upwelling

[Demo](https://vigilant-dijkstra-055cb3.netlify.app/)

## Step 0: Get on Node v16, and yarn 

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

We'll also need yarn; on a Mac you can use homebrew to install it

```
brew install yarn
```

or use npm on other platforms

```
npm install --global yarn
```

# Building upwelling

## Step 1: Run the server (optional)

See README in `server/`

 
## Step 2: Install & run

```
npm i
npm start
```

## License

MIT
