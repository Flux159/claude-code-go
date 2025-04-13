import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { IconSymbol } from "@/components/ui/IconSymbol";
import { ThemePreference, useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { Constants } from "@/constants/Constants";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { TOKEN_STORAGE_KEY } from "@/utils/api";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}



// Theme selector component for settings modal
function ThemeSelector() {
  const { themePreference, setThemePreference } = useAppContext();
  const colorScheme = useColorScheme();
  const tintColor = useThemeColor({}, "tint");

  // Get appropriate icon and active status for each theme option
  const getThemeOption = (theme: ThemePreference) => {
    let iconName: any;
    let label: string;
    let isActive: boolean;

    switch (theme) {
      case "light":
        iconName = "sun.max.fill";
        label = "Light";
        isActive = themePreference === "light";
        break;
      case "dark":
        iconName = "moon.fill";
        label = "Dark";
        isActive = themePreference === "dark";
        break;
      case "auto":
        iconName = "circle.bottomhalf.filled";
        label = "Auto";
        isActive = themePreference === "auto";
        break;
    }

    return { iconName, label, isActive };
  };

  return (
    <View style={styles.themeSection}>
      <View style={styles.themeOptions}>
        {(["light", "dark", "auto"] as ThemePreference[]).map((theme) => {
          const { iconName, label, isActive } = getThemeOption(theme);
          return (
            <TouchableOpacity
              key={theme}
              style={[styles.themeButton, isActive && styles.activeThemeButton]}
              onPress={() => setThemePreference(theme)}
            >
              <IconSymbol
                name={iconName}
                size={24}
                color={isActive ? tintColor : "#999"}
              />
              <ThemedText
                style={[
                  styles.themeButtonLabel,
                  isActive && { color: tintColor },
                ]}
              >
                {label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

type TabName = "general";

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { hostname } = useAppContext();
  const { username, logout } = useAuth();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");



  const handleSave = () => {
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.centeredView}
      >
        <ThemedView style={styles.modalView}>
          <ThemedText type="subtitle" style={styles.modalTitle}>
            Settings
          </ThemedText>

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            General
          </ThemedText>

          {/* User account information */}
          <View style={styles.accountSection}>
            {username ? (
              <View style={styles.userInfoRow}>
                <View style={styles.userInfo}>
                  <ThemedText>Logged in as:</ThemedText>
                  <ThemedText style={styles.usernameText}>{username}</ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={() => {
                    logout();
                    onClose();
                  }}
                >
                  <ThemedText style={styles.logoutButtonText}>Log Out</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <ThemedText style={styles.notLoggedInText}>
                Not logged in
              </ThemedText>
            )}
          </View>

          {/* Theme selector */}
          <ThemeSelector />

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <ThemedText>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <ThemedText style={styles.saveButtonText}>Save</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: "85%",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 10,
    textAlign: "center",
  },
  sectionTitle: {
    marginBottom: 20,
    textAlign: "center",
  },
  // Theme selector styles
  themeSection: {
    marginBottom: 20,
  },
  themeOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  themeButton: {
    flex: 1,
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
  },
  activeThemeButton: {
    backgroundColor: "rgba(200, 200, 200, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(150, 150, 150, 0.2)",
  },
  themeButtonLabel: {
    marginTop: 6,
    fontSize: 12,
  },
  // Account section styles
  accountSection: {
    marginBottom: 20,
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  userInfo: {
    flex: 1,
  },
  usernameText: {
    fontWeight: "500",
    marginTop: 4,
  },
  notLoggedInText: {
    fontStyle: "italic",
    opacity: 0.7,
    paddingVertical: 12,
  },
  logoutButton: {
    backgroundColor: "#FF6B6B",
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    elevation: 2,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "white",
  },
  // Button container styles
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 10,
  },
  button: {
    flex: 1,
    borderRadius: 5,
    padding: 10,
    elevation: 2,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#007AFF",
  },
  saveButtonText: {
    color: "white",
  }
});
