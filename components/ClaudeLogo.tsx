import React from "react";
import { View, StyleSheet } from "react-native";
import ClaudeGoSvg from "../assets/images/claude-go.svg";

interface ClaudeLogoProps {
  size?: number;
  color?: string;
}

export function ClaudeLogo({ size = 24, color = "#DB713E" }: ClaudeLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <ClaudeGoSvg width={size} height={size} fill={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
});
