---
name: setup-copilot-cloud-agent
description: Read when you received a task via GitHub Copilot Cloud Agent and want to set up the environment for it
user-invocable: false
---

# Setup environment for GitHub Copilot Cloud Agent

Use [proto](https://moonrepo.dev/proto) to install the required version of Node.js and pnpm.

```sh
bash <(curl -fsSL https://moonrepo.dev/install/proto.sh)
```

Then run:

```sh
proto install
```

You can now use the `node`, `pnpm`, and `pnpx` commands.

## Troubleshooting

If the installation fails, the requester may have forgotten to allow required domains in the firewall. Check the table below:

| Failing command | Error message | Domain forgotten to allow by the requester |
| --- | --- | --- |
| 1st command | (Mentioning `moonrepo.dev`) | `moonrepo.dev` |
| 2nd command | Error: proto::resolve::offline::version_required / Internet connection required to load and resolve a valid version. | `detectportal.firefox.com` |
