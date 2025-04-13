# Claude Code Go

Mobile app and server for [claude code](https://github.com/anthropics/claude-code/).

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

Make a password for claude code go, change "yourpassword" in the command below to a secure password:
```
mkdir -p ~/.claudecodego/ && echo "yourpassword" > ~/.claudecodego/passwd 
```

Then, clone the repo & run the following command to install dependencies. Note that you need node, npm, and python in order to run the server & expo go server. See [this](https://github.com/anthropics/claude-code/issues/771) for why the server is in python:

```shell
git clone https://github.com/Flux159/claude-code-go.git && cd claude-code-go
npm install
```

In 2 different terminal sessions, run the following commands:

```shell
npm run start
npm run server
```

To use the app on your phone, install [Expo Go](https://apps.apple.com/us/app/expo-go/id982107779) and use the QR code that appears from `npm run start` to get the app. (Use [Expo Go on Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent&hl=en_US) for android).

To login via your local network on your phone, use the hostname or IP address of the computer you've setup the claude-code-go server on, your username on that PC or Mac, and the password in the `~/.claudecodego/passwd` file - if you don't specify a password there, then the default password is "password123".

You should absolutely change the default password before starting the server.

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
