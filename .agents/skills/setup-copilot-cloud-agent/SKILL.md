---
name: setup-copilot-cloud-agent
description: Must read before setting up the environment in GitHub-Hosted runners for Copilot Cloud Agent. Ignore in the other environments.
user-invocable: false
---

# Setup environment for GitHub Copilot Cloud Agent

Use [proto](https://moonrepo.dev/proto) to install the required version of Node.js and pnpm. Install it by (snapshot from the official website on 2026-06):

```sh
bash <(curl -fsSL https://moonrepo.dev/install/proto.sh)
```

Then run:

```sh
proto install
```

You can now use the `node`, `pnpm`, and `pnpx` commands.

## Configuration policy

This project won't use `.prototools` to manage versions of tools. All requirements must be declared only in files that can be shared with the other tools, such as `package.json` and `.node-version`. If a `.prototools` file remains in the project root, delete it before you finish the current task.

## Troubleshooting

If you encounter an error that seems specific to proto, see ./troubleshooting.md first.
