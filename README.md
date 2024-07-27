# inrt

inrt stands for install node runtime.

opswalrus needed a reliable way to install a node runtime without installing a ton of other stuff.

This project downloads an appropriate node runtime for the system it runs on.

Usage:
```bash
❯ ./inrt.sh
```

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.20. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
