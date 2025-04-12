import React, { useEffect, useState } from "react";
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

import { IconSymbol } from "@/components/ui/IconSymbol";
import { ThemePreference, useAppContext } from "@/contexts/AppContext";
import { Constants } from "@/constants/Constants";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface WebCommandStatus {
  running: boolean;
  command: string;
  pid: number | null;
  start_time: number | null;
  exit_code: number | null;
  output: string[];
  error: string | null;
  output_lines: number;
}

// Web command control component
function WebCommandControl({
  command,
  onCommandChange,
}: {
  command: string;
  onCommandChange: (command: string) => void;
}) {
  const { hostname } = useAppContext();
  const [status, setStatus] = useState<WebCommandStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isStopping, setIsStopping] = useState<boolean>(false);
  const [isRestarting, setIsRestarting] = useState<boolean>(false);
  const tintColor = useThemeColor({}, "tint");

  // Fetch status with loading indicator (for initial/manual refresh)
  const fetchStatusWithLoading = async () => {
    try {
      setLoading(true);
      await fetchStatusInternal();
    } finally {
      setLoading(false);
    }
  };

  // Fetch status without loading indicator (for background updates)
  const fetchStatusSilently = async () => {
    try {
      await fetchStatusInternal();
    } catch (error) {
      console.error("Failed to fetch web command status silently:", error);
    }
  };

  // Internal status fetching function
  const fetchStatusInternal = async () => {
    const response = await fetch(
      `http://${hostname}:${Constants.serverPort}/web-command`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      setStatus(data);
    }

    return response;
  };

  const startCommand = async () => {
    try {
      setIsStarting(true);
      const response = await fetch(
        `http://${hostname}:${Constants.serverPort}/web-command/start`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ command }),
        }
      );

      if (response.ok) {
        await fetchStatusWithLoading();
      }
    } catch (error) {
      console.error("Failed to start web command:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const stopCommand = async () => {
    try {
      setIsStopping(true);
      const response = await fetch(
        `http://${hostname}:${Constants.serverPort}/web-command/stop`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        await fetchStatusWithLoading();
      }
    } catch (error) {
      console.error("Failed to stop web command:", error);
    } finally {
      setIsStopping(false);
    }
  };

  const restartCommand = async () => {
    try {
      setIsRestarting(true);
      const response = await fetch(
        `http://${hostname}:${Constants.serverPort}/web-command/restart`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ command }),
        }
      );

      if (response.ok) {
        await fetchStatusWithLoading();
      }
    } catch (error) {
      console.error("Failed to restart web command:", error);
    } finally {
      setIsRestarting(false);
    }
  };

  useEffect(() => {
    if (command) {
      // Initial fetch with loading indicator
      fetchStatusWithLoading();
    }

    // Poll for status updates without showing loading indicator
    const intervalId = setInterval(fetchStatusSilently, 5000);
    return () => clearInterval(intervalId);
  }, [command, hostname]);

  return (
    <View style={styles.webCommandControlContainer}>
      <View style={styles.statusIndicator}>
        {loading ? (
          <ActivityIndicator size="small" color={tintColor} />
        ) : (
          <View
            style={[
              styles.statusDot,
              { backgroundColor: status?.running ? "#4CAF50" : "#F44336" },
            ]}
          />
        )}
        <ThemedText style={styles.statusText}>
          {status?.running ? "Running" : "Stopped"}
        </ThemedText>
      </View>

      <View style={styles.webCommandButtons}>
        <TouchableOpacity
          style={[
            styles.iconButton,
            status?.running ? styles.iconButtonDisabled : {},
          ]}
          onPress={startCommand}
          disabled={isStarting || status?.running}
        >
          {isStarting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <IconSymbol
              name="play.fill"
              size={18}
              color={status?.running ? "#999" : "#fff"}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.iconButton,
            !status?.running ? styles.iconButtonDisabled : {},
          ]}
          onPress={stopCommand}
          disabled={isStopping || !status?.running}
        >
          {isStopping ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <IconSymbol
              name="stop.fill"
              size={18}
              color={!status?.running ? "#999" : "#fff"}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={restartCommand}
          disabled={isRestarting}
        >
          {isRestarting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <IconSymbol name="arrow.clockwise" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
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
      <ThemedText style={styles.themeSectionTitle}>Theme</ThemedText>
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

type TabName = "general" | "webCommand";

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { hostname, setHostname, port, setPort, webCommand, setWebCommand } =
    useAppContext();
  const [hostnameValue, setHostnameValue] = useState(hostname);
  const [portValue, setPortValue] = useState(port.toString());
  const [webCommandValue, setWebCommandValue] = useState(webCommand);
  const [portError, setPortError] = useState("");
  const [activeTab, setActiveTab] = useState<TabName>("general");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");

  useEffect(() => {
    if (visible) {
      setHostnameValue(hostname);
      setPortValue(port.toString());
      setWebCommandValue(webCommand);
      setPortError("");
      // Reset to general tab when opening
      setActiveTab("general");
    }
  }, [visible, hostname, port, webCommand]);

  // Fetch logs when the web command tab is active
  useEffect(() => {
    if (visible && activeTab === "webCommand") {
      // Initial fetch with loading indicator
      fetchLogsWithLoading();

      // Poll for logs every 3 seconds when tab is active - without loading indicator
      const intervalId = setInterval(fetchLogsSilently, 3000);
      return () => clearInterval(intervalId);
    }
  }, [visible, activeTab, hostname]);

  // Fetch logs with loading indicator (for initial load)
  const fetchLogsWithLoading = async () => {
    if (!visible || activeTab !== "webCommand") return;

    try {
      setLoading(true);
      await fetchLogsInternal();
    } finally {
      setLoading(false);
    }
  };

  // Fetch logs without loading indicator (for background updates)
  const fetchLogsSilently = async () => {
    if (!visible || activeTab !== "webCommand") return;

    try {
      await fetchLogsInternal();
    } catch (error) {
      console.error("Failed to fetch web command logs silently:", error);
    }
  };

  // Internal function to fetch logs
  const fetchLogsInternal = async () => {
    const response = await fetch(
      `http://${hostname}:${Constants.serverPort}/web-command/logs?max=50`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      setLogs(data.logs || []);
    }

    return response;
  };

  const handleSave = () => {
    // Validate port
    const portNum = parseInt(portValue, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setPortError("Port must be a number between 1 and 65535");
      return;
    }

    setHostname(hostnameValue);
    setPort(portNum);
    setWebCommand(webCommandValue);
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

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "general" && styles.activeTabButton,
              ]}
              onPress={() => setActiveTab("general")}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === "general" && styles.activeTabText,
                ]}
              >
                General
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "webCommand" && styles.activeTabButton,
              ]}
              onPress={() => setActiveTab("webCommand")}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === "webCommand" && styles.activeTabText,
                ]}
              >
                Web Preview
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === "general" ? (
            <>
              <View style={styles.inputContainer}>
                <ThemedText>Hostname</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor,
                      color: textColor,
                      borderColor:
                        Platform.OS === "ios" ? "#cccccc80" : "transparent",
                      borderWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                  value={hostnameValue}
                  onChangeText={setHostnameValue}
                  placeholder="macbook.local"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText>Port</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor,
                      color: textColor,
                      borderColor:
                        Platform.OS === "ios" ? "#cccccc80" : "transparent",
                      borderWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                  value={portValue}
                  onChangeText={(text) => {
                    setPortValue(text);
                    setPortError("");
                  }}
                  placeholder="3000"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {portError ? (
                  <ThemedText style={styles.errorText}>{portError}</ThemedText>
                ) : null}
              </View>

              {/* Theme selector */}
              <ThemeSelector />
            </>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <ThemedText>Web Preview Command</ThemedText>
                <View style={styles.webCommandRow}>
                  <TextInput
                    style={[
                      styles.webCommandInput,
                      {
                        backgroundColor,
                        color: textColor,
                        borderColor:
                          Platform.OS === "ios" ? "#cccccc80" : "transparent",
                        borderWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                    value={webCommandValue}
                    onChangeText={setWebCommandValue}
                    placeholder="npm run dev"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <WebCommandControl
                    command={webCommandValue}
                    onCommandChange={setWebCommandValue}
                  />
                </View>
              </View>

              {/* Log viewer */}
              <View style={styles.logContainer}>
                <ThemedText style={styles.logTitle}>Command Logs</ThemedText>
                {loading ? (
                  <View style={styles.loaderContainer}>
                    <ActivityIndicator size="small" color={tintColor} />
                    <ThemedText style={styles.loaderText}>
                      Loading logs...
                    </ThemedText>
                  </View>
                ) : logs.length > 0 ? (
                  <ScrollView
                    style={[
                      styles.logScroll,
                      {
                        backgroundColor:
                          Platform.OS === "ios"
                            ? "rgba(0,0,0,0.05)"
                            : "rgba(0,0,0,0.1)",
                      },
                    ]}
                  >
                    {logs.map((log, index) => (
                      <ThemedText
                        key={index}
                        style={[
                          styles.logLine,
                          log.includes("ERROR:") && styles.errorLogLine,
                        ]}
                      >
                        {log}
                      </ThemedText>
                    ))}
                  </ScrollView>
                ) : (
                  <ThemedText style={styles.noLogsText}>
                    No logs available
                  </ThemedText>
                )}
              </View>
            </>
          )}

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
  // Tab navigation styles
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.2)",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 14,
    color: "#999",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "500",
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 40,
    marginTop: 8,
    padding: 10,
    borderRadius: 5,
  },
  // Web command controls
  webCommandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  webCommandInput: {
    flex: 1,
    height: 40,
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  webCommandControlContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
  },
  webCommandButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconButton: {
    width: 30,
    height: 30,
    backgroundColor: "#007AFF",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  iconButtonDisabled: {
    backgroundColor: "#ccc",
  },
  // Log viewer styles
  logContainer: {
    marginBottom: 20,
  },
  logTitle: {
    marginBottom: 8,
    fontWeight: "500",
  },
  logScroll: {
    height: 200,
    borderRadius: 5,
    padding: 8,
  },
  logLine: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 3,
  },
  errorLogLine: {
    color: "#F44336",
  },
  loaderContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 10,
    color: "#999",
  },
  noLogsText: {
    height: 200,
    textAlign: "center",
    textAlignVertical: "center",
    color: "#999",
  },
  // Theme selector styles
  themeSection: {
    marginBottom: 20,
  },
  themeSectionTitle: {
    marginBottom: 12,
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
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
  },
});
