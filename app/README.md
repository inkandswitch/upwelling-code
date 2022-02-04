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

We'll also need yarn; on a Mac you can use homebrew to install it

```
brew install yarn
```

or use npm on other platforms

```
npm install --global yarn
```

For Rust, you can use the default installer.

```
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Once that's installed, you can use rustup to install wasm-pack:

```
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

# Building upwelling

## Step 1: Build Experimental `automerge-wasm`

```
git submodule update --init
cd automerge-rs/automerge-wasm
yarn && yarn pkg 
cd ../..
```

If you're on Mac M1, you may get "Error: no prebuilt wasm-opt binaries are available for this platform: Unrecognized target!"

To disable `wasm-opt`, remove the comment to enable `wasm-opt = false` to in `Cargo.toml`:

```
[package.metadata.wasm-pack.profile.release]
wasm-opt = false
```

## Step 2: Run the server (optional)

See README in `server/`

 
## Step 3: Install & run

```
npm i
npm start
```

## License

MIT
