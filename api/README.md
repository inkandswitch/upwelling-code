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
<<<<<<< HEAD
npm run build
=======
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

# Building upwelling

## Step 1: Build Experimental `automerge-wasm`

```
git clone https://github.com/automerge/automerge-rs.git
cd automerge-rs
git checkout 06f0b201c9fdc9012d196197ebe7ecdfd24466b4
cd automerge-wasm
npm i && npm run build
cd ../..
```

If you're on Mac M1, you may get "Error: no prebuilt wasm-opt binaries are available for this platform: Unrecognized target!"

To disable `wasm-opt`, remove the comment to enable `wasm-opt = false` to in `Cargo.toml`:

```
[package.metadata.wasm-pack.profile.release]
wasm-opt = false
>>>>>>> c78e26640d5ddc47063a4c17ade69ce39a03903e
```
