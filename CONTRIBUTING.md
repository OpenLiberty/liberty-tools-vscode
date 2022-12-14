# Contributing to Liberty Dev Extension for Visual Studio Code

We welcome contributions, and request you follow these guidelines.

- [Raising issues](#raising-issues)
- [Legal](#legal)
- [Coding Standards](#coding-standards)
- [Developing](#developing)

### Raising issues

Please raise any bug reports on the [issue tracker](https://github.com/OpenLiberty/open-liberty-tools-vscode/issues). Be sure to search the list to see if your issue has already been raised.

A good bug report makes it easy for us to understand what you were trying to do and what went wrong.

### Legal

In order to make contribution as easy as possible, we follow the same approach that the Linux® Kernel [community](https://elinux.org/Developer_Certificate_Of_Origin) uses to manage code contributions: the [Developer's Certificate of Origin 1.1 (DCO)](https://developercertificate.org/).

We simply ask that when submitting a pull request for review, the developer
must include a sign-off statement in the commit message.

Here is an example Signed-off-by line, which indicates that the
submitter accepts the DCO:

```text
Signed-off-by: John Doe <john.doe@example.com>
```

You can include this automatically when you commit a change to your
local git repository using the following command:

```bash
git commit -s
```

### Coding Standards

This project follows standard TypeScript language [coding conventions](https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines).

Please note:

- all PRs must pass TypeScript linting checks
- all PRs must have passing builds

### Developing

To learn how to setup, run, and test your development environment, follow the provided [development instructions](DEVELOPING.md).
