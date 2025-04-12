import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
  SafeAreaView,
} from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { IconSymbol } from "./ui/IconSymbol";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";

interface FileTreeProps {
  isVisible: boolean;
  onClose: () => void;
}

export function FileTree({ isVisible, onClose }: FileTreeProps) {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-300)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [localVisible, setLocalVisible] = useState(isVisible);

  // Get theme-aware colors
  const backgroundColor = useThemeColor({}, "background");
  const borderColor = useThemeColor({}, "icon");
  const textColor = useThemeColor({}, "text");
  const tintColor = Colors[colorScheme ?? "light"].tint;

  useEffect(() => {
    if (isVisible) {
      setLocalVisible(true);
      // Animate the drawer in
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate the drawer out
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -300,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setLocalVisible(false);
      });
    }
  }, [isVisible]);

  if (!localVisible) return null;

  return (
    <View style={styles.mainContainer}>
      {/* Background overlay - clickable to close drawer */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity }]} />
      </TouchableWithoutFeedback>

      {/* The actual drawer */}
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateX }],
            paddingTop: insets.top,
            backgroundColor,
            borderRightColor: borderColor,
          },
        ]}
      >
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <ThemedText type="title" style={styles.title}>
            File Explorer
          </ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="chevron.right" size={24} color={tintColor} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.fileList}>
          <View style={[styles.fileItem, { borderBottomColor: borderColor }]}>
            <IconSymbol name="house" size={20} color={tintColor} />
            <ThemedText style={styles.fileName}>project_root/</ThemedText>
          </View>

          <View
            style={[
              styles.fileItem,
              styles.indented,
              { borderBottomColor: borderColor },
            ]}
          >
            <IconSymbol name="globe" size={20} color={tintColor} />
            <ThemedText style={styles.fileName}>app/</ThemedText>
          </View>

          <View
            style={[
              styles.fileItem,
              styles.doubleIndented,
              { borderBottomColor: borderColor },
            ]}
          >
            <IconSymbol name="globe" size={20} color={tintColor} />
            <ThemedText style={styles.fileName}>(tabs)/</ThemedText>
          </View>

          <View
            style={[
              styles.fileItem,
              styles.doubleIndented,
              { borderBottomColor: borderColor },
            ]}
          >
            <IconSymbol name="message.fill" size={20} color={tintColor} />
            <ThemedText style={styles.fileName}>index.tsx</ThemedText>
          </View>

          <View
            style={[
              styles.fileItem,
              styles.indented,
              { borderBottomColor: borderColor },
            ]}
          >
            <IconSymbol name="message.fill" size={20} color={tintColor} />
            <ThemedText style={styles.fileName}>components/</ThemedText>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    elevation: 5,
  },
  overlay: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
  },
  container: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    borderRightWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
  },
  closeButton: {
    padding: 4,
  },
  fileList: {
    flex: 1,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  fileName: {
    marginLeft: 8,
  },
  indented: {
    paddingLeft: 32,
  },
  doubleIndented: {
    paddingLeft: 48,
  },
});
