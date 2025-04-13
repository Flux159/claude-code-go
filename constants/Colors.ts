/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColor = '#CC7C5E';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColor,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColor,
    assistantBubble: '#F1F3F5',
    userBubble: '#007AFF',
    codeBackground: '#f5f5f5',
    codeBorder: '#e0e0e0',
    divider: '#cccccc80',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColor,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColor,
    assistantBubble: '#2C2F31',
    userBubble: '#007AFF',
    codeBackground: '#1e1e1e',
    codeBorder: '#333',
    divider: '#666666',
  },
};
