# RFQ

**Setup**

Build and test.

```bash
anchor build
anchor test
anchor deploy
```

**Deploy**

Make sure `Anchor.toml` and `solana config get` are set to `mainnet`.

```bash
anchor deploy
```

Failed recovery deployment.

```bash
solana-keygen recover -f -o ~/.config/solana/recover.json
solana program close ~/.config/solana/recover.json
# For all buffers
solana program close --buffers
```

Sometimes the network is too slow and you get an invalid blockhash. Check out [Solana Beach](https://solanabeach.io/validators) and make sure your Solana version is using whatever node version the majority of the networks are on.

**CLI**

Initialize the protocol.

```bash
./bin/init.ts
```

List RFQs and responses.

```bash
./bin/list.ts
```