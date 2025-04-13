# Claude Code Go

Mobile app for claude code.

https://github.com/user-attachments/assets/44ea735b-bd89-46c8-9833-85fea59cee40

## Getting started

Make sure that you have installed & run [claude code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) once in your terminal first using the command and then accept it:

```
claude --dangerously-skip-permissions
```

Then, run the following command to install dependencies:

```shell
npm install
```

In 3 different terminal sessions, run the following commands:

```shell
npm run start
npm run server
npm run dev
```

## Troubleshooting

If you get an error running on your mobile (Android) as follows:

```
Uncaught Error: java.io.IOException: Failed to download remote
update
19:45:57 Fatal
```

You can run with the `--tunnel` flag instead

```
npx expo start --tunnel
```

See more details here: https://stackoverflow.com/questions/79332816/uncaught-error-java-io-ioexception-failed-to-download-remote-update
