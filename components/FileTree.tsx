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
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { IconSymbol } from "./ui/IconSymbol";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useAppContext } from "@/contexts/AppContext";
import { Constants } from "@/constants/Constants";

interface FileItem {
  name: string;
  type: "directory" | "file";
  path: string;
}

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
  const { hostname, currentDirectory, setCurrentDirectory } = useAppContext();
  const PYTHON_PORT = Constants.serverPort;

  // Get theme-aware colors
  const backgroundColor = useThemeColor({}, "background");
  const borderColor = useThemeColor({}, "icon");
  const textColor = useThemeColor({}, "text");
  const tintColor = Colors[colorScheme ?? "light"].tint;

  // Directory state
  const [directoryContents, setDirectoryContents] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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

      // If we have a current directory, load its contents
      if (currentDirectory) {
        console.log(`Using saved directory: ${currentDirectory}`);
        loadDirectory(currentDirectory);
      } else {
        // Otherwise fetch the initial directory
        console.log("No current directory, fetching from server");
        fetchInitialDirectory();
      }
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
  }, [isVisible, currentDirectory, hostname, PYTHON_PORT]);

  const fetchInitialDirectory = async () => {
    try {
      console.log(
        `Fetching initial directory from: http://${hostname}:${PYTHON_PORT}/directories`
      );
      setIsLoading(true);
      setError("");
      setDirectoryContents([]); // Clear current contents

      // Get auth token from AsyncStorage
      const token = await AsyncStorage.getItem('auth_token');

      const response = await fetch(
        `http://${hostname}:${PYTHON_PORT}/directories`,
        {
          headers: {
            "Authorization": token ? `Bearer: ${token}` : "",
          }
        }
      );
      const data = await response.json();

      if (response.ok) {
        console.log(`Received directory from server: ${data.directory}`);
        // Update the current directory in the app context
        setCurrentDirectory(data.directory);
        // Load the contents of this directory
        await loadDirectory(data.directory);
      } else {
        console.error(`Server error: ${data.error || "Unknown error"}`);
        setError(data.error || "Failed to fetch initial directory");
      }
    } catch (error) {
      console.error("Error fetching directory:", error);
      setError(
        "Error loading initial directory: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadDirectory = async (directoryPath: string) => {
    try {
      console.log(`Loading contents of directory: ${directoryPath}`);
      setIsLoading(true);
      setError("");

      // Get auth token from AsyncStorage
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await fetch(
        `http://${hostname}:${PYTHON_PORT}/directories`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer: ${token}` : "",
          },
          body: JSON.stringify({ directory: directoryPath }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        console.log(
          `Loaded ${data.contents?.length || 0} items from ${directoryPath}`
        );
        setDirectoryContents(data.contents || []);
      } else {
        console.error(
          `Error loading directory: ${data.error || "Unknown error"}`
        );
        setError(data.error || "Failed to load directory contents");
      }
    } catch (error) {
      console.error("Error in loadDirectory:", error);
      setError(
        "Error loading directory: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileItemPress = (item: FileItem) => {
    if (item.type === "directory") {
      setCurrentDirectory(item.path);
    }
  };

  const getParentDirectory = (directory: string) => {
    const parts = directory.split("/");
    parts.pop(); // Remove the last part
    return parts.join("/") || "/";
  };

  const navigateToParent = () => {
    if (currentDirectory && currentDirectory !== "/") {
      const parentDir = getParentDirectory(currentDirectory);
      setCurrentDirectory(parentDir);
    }
  };

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
          },
        ]}
      >
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            File Explorer
          </ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="chevron.right" size={24} color={tintColor} />
          </TouchableOpacity>
        </View>

        {/* Current path display with reset button */}
        <View style={styles.pathDisplay}>
          <View style={styles.pathRow}>
            <ThemedText
              numberOfLines={1}
              ellipsizeMode="middle"
              style={styles.pathText}
            >
              {currentDirectory}
            </ThemedText>
            <TouchableOpacity
              onPress={fetchInitialDirectory}
              style={[
                styles.resetButton,
                {
                  backgroundColor:
                    backgroundColor === "#ffffff"
                      ? "#f0f0f0"
                      : "rgba(255,255,255,0.15)",
                },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <IconSymbol
                  name="arrow.clockwise"
                  size={16}
                  color={tintColor}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={tintColor} />
            <ThemedText style={styles.loaderText}>Loading...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: tintColor }]}
              onPress={() =>
                currentDirectory
                  ? loadDirectory(currentDirectory)
                  : fetchInitialDirectory()
              }
            >
              <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={styles.fileList}>
            {/* Parent directory */}
            {currentDirectory !== "/" && (
              <TouchableOpacity
                style={styles.fileItem}
                onPress={navigateToParent}
              >
                <IconSymbol name="arrow.up" size={20} color={tintColor} />
                <ThemedText style={styles.fileName}>
                  Parent Directory
                </ThemedText>
              </TouchableOpacity>
            )}

            {/* Directories first */}
            {directoryContents
              .filter(
                (item) =>
                  item.type === "directory" && !item.name.startsWith(".")
              )
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((item, index) => (
                <TouchableOpacity
                  key={item.path + index}
                  style={styles.fileItem}
                  onPress={() => handleFileItemPress(item)}
                >
                  <IconSymbol name="house" size={20} color={tintColor} />
                  <ThemedText
                    style={styles.fileName}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {item.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}

            {/* Then files */}
            {directoryContents
              .filter(
                (item) => item.type === "file" && !item.name.startsWith(".")
              )
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((item, index) => (
                <TouchableOpacity
                  key={item.path + index}
                  style={styles.fileItem}
                >
                  <IconSymbol name="message.fill" size={20} color={tintColor} />
                  <ThemedText
                    style={styles.fileName}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {item.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}

            {directoryContents.length === 0 && (
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>
                  Empty directory
                </ThemedText>
              </View>
            )}
          </ScrollView>
        )}
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
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 18,
  },
  closeButton: {
    padding: 4,
  },
  pathDisplay: {
    padding: 10,
    marginBottom: 5,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
  },
  pathRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pathText: {
    flex: 1,
  },
  resetButton: {
    padding: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  fileList: {
    flex: 1,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
    marginVertical: 2,
  },
  fileName: {
    marginLeft: 8,
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#ff6b6b",
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  emptyContainer: {
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    opacity: 0.5,
  },
});
