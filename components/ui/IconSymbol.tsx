// This file is a fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight } from "expo-symbols";
import React from "react";
import { OpaqueColorValue, StyleProp } from "react-native";

// Add your SFSymbol to MaterialIcons mappings here.
const MAPPING = {
  // See MaterialIcons here: https://icons.expo.fyi
  // See SF Symbols in the SF Symbols app on Mac.
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "message.fill": "chat",
  globe: "public",
  gearshape: "settings",
  "arrow.up": "arrow-upward",
  "plus.square": "add",
  "arrow.clockwise": "refresh",
  house: "home",
  "sun.max.fill": "wb_sunny",
  "moon.fill": "nightlight_round",
  "circle.bottomhalf.filled": "brightness_auto",
  "face.smiling": "emoji_emotions",
  "line.3.horizontal": "menu",
  folder: "folder",
  "doc.text": "description",
  trash: "delete",
  xmark: "close",
  "arrow.down.circle.fill": "arrow_circle_down",
  "arrow.down": "arrow_downward",
} as Partial<
  Record<
    import("expo-symbols").SymbolViewProps["name"],
    React.ComponentProps<typeof MaterialIcons>["name"]
  >
>;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<any>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style}
    />
  );
}
