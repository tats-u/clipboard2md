## Errors caused by badly configured firewall

If the installation fails, the requester may have forgotten to allow required domains in the firewall. Check the table below:

| Failing command | Error message | Domain forgotten to allow by the requester |
| --- | --- | --- |
| 1st command | (Mentioning `moonrepo.dev`) | `moonrepo.dev` |
| 2nd command | Error: proto::resolve::offline::version_required / Internet connection required to load and resolve a valid version. | `detectportal.firefox.com` |

## Errors caused by outdated tools

An error starting with `This project requires <TOOL> <VERSION> (detected from <PATH>), but this version has not been installed.` indicates that you forgot to run `proto install` again after modifying `packageManager` in `package.json` or `.node-version`. Make sure to run `proto install` again after modifying such files.
