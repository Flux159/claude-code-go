# Claude Code Go

Mobile app for [claude code](https://github.com/anthropics/claude-code/).

https://github.com/user-attachments/assets/26123e2d-cca4-4d95-8429-2ef3cc8a278d

## Features

- [x] Authenticate to your claude code go server
- [x] File tree browsing to choose a directory for your project
- [x] Spin up a preview web server to be able to see changes on your phone
- [x] Prompt claude code and view its tool calls and messages on your phone. Use dictation to speak your changes into existence!
- [x] Chat history of your previous chats
- [x] Git commit and create a PR directly from mobile

## Getting started

Make sure that you have installed & run [claude code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) once in your terminal first using the command and then accept it:

```
claude --dangerously-skip-permissions
```

Then, clone the repo & run the following command to install dependencies:

```shell
npm install
```

In 2 different terminal sessions, run the following commands:

```shell
npm run start
npm run server
```

To use the app on your phone, install [Expo Go](https://apps.apple.com/us/app/expo-go/id982107779) and use the QR code that appears from `npm run start` to get the app. (Use [Expo Go on Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent&hl=en_US) for android).

To login via your local network on your phone, use the hostname or IP address of the computer you've setup the claude-code-go server on, your username on that PC or Mac, and the password in the server/passwd file. 

You should change the default password before starting the server. 

Inside of the app, you can go to Settings -> Web Preview and use a command to run your web app for previews built in from there. By default it's setup to run:
```shell
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
