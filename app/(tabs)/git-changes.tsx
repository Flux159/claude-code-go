import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppContext } from "@/contexts/AppContext";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Constants } from "@/constants/Constants";
import { useFocusEffect } from "expo-router";
import { TOKEN_STORAGE_KEY } from "@/utils/api";

// Types for Git status and diff
interface GitFile {
  status: string;
  status_type: string;
  path: string;
  selected?: boolean;
}

interface GitDiff {
  success: boolean;
  diff: string;
  file_path?: string;
  error?: string;
}

// Expose fetchGitStatus globally
global.fetchGitStatus = null as unknown as (() => Promise<void>) | null;

export default function GitChangesScreen() {
  const { hostname, currentDirectory } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [changedFiles, setChangedFiles] = useState<GitFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDiffs, setFileDiffs] = useState<Record<string, string>>({});
  const [commitMessage, setCommitMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Theme colors
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const dividerColor = useThemeColor({}, "divider");

  // Fetch diff for a specific file
  const fetchFileDiff = useCallback(
    async (filePath: string) => {
      if (!currentDirectory) return;

      try {
        // Get auth token
        const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

        const response = await fetch(
          `http://${hostname}:${Constants.serverPort}/git/diff`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": token ? `Bearer: ${token}` : "",
            },
            body: JSON.stringify({
              directory: currentDirectory,
              file_path: filePath,
            }),
          }
        );

        const data: GitDiff = await response.json();

        if (data.success) {
          setFileDiffs((prev) => ({
            ...prev,
            [filePath]: data.diff,
          }));
        } else {
          console.error("Error fetching file diff:", data.error);
        }
      } catch (error) {
        console.error("Error fetching file diff:", error);
      }
    },
    [hostname, currentDirectory]
  );

  // Fetch Git status from the server
  const fetchGitStatus = useCallback(async () => {
    if (!currentDirectory) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Get auth token
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

      const response = await fetch(
        `http://${hostname}:${Constants.serverPort}/git/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer: ${token}` : "",
          },
          body: JSON.stringify({
            directory: currentDirectory,
          }),
        }
      );

      const data = await response.json();

      if (data.success && data.changes) {
        setChangedFiles(data.changes);
        // If there's at least one file, select it by default
        if (data.changes.length > 0 && !selectedFile) {
          setSelectedFile(data.changes[0].path);
          fetchFileDiff(data.changes[0].path);
        }
      } else {
        setErrorMessage(data.error || "Failed to fetch Git status");
      }
    } catch (error) {
      console.error("Error fetching Git status:", error);
      setErrorMessage("Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  }, [hostname, currentDirectory, selectedFile, fetchFileDiff]);

  // Handle file selection
  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath);

    // Load diff if not already loaded
    if (!fileDiffs[filePath]) {
      fetchFileDiff(filePath);
    }
  };

  // Reset changes for a specific file
  const handleResetFile = async (filePath: string) => {
    if (!currentDirectory) return;

    setActionLoading(true);
    setActionResult(null);
    setErrorMessage(null);

    try {
      // Get auth token
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

      const response = await fetch(
        `http://${hostname}:${Constants.serverPort}/git/reset-file`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer: ${token}` : "",
          },
          body: JSON.stringify({
            directory: currentDirectory,
            file_path: filePath,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setActionResult(`Reset ${filePath} successfully`);

        // Remove the file from our list and diffs
        setChangedFiles((prev) =>
          prev.filter((file) => file.path !== filePath)
        );
        setFileDiffs((prev) => {
          const newDiffs = { ...prev };
          delete newDiffs[filePath];
          return newDiffs;
        });

        // If this was the selected file, select another one
        if (selectedFile === filePath) {
          const remainingFiles = changedFiles.filter(
            (file) => file.path !== filePath
          );
          if (remainingFiles.length > 0) {
            setSelectedFile(remainingFiles[0].path);
          } else {
            setSelectedFile(null);
          }
        }
      } else {
        setErrorMessage(data.error || "Failed to reset file");
      }
    } catch (error) {
      console.error("Error resetting file:", error);
      setErrorMessage("Error connecting to server");
    } finally {
      setActionLoading(false);
    }
  };

  // Reset all changes
  const handleResetAll = async () => {
    if (!currentDirectory) return;

    setActionLoading(true);
    setActionResult(null);
    setErrorMessage(null);

    try {
      // Get auth token
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

      const response = await fetch(
        `http://${hostname}:${Constants.serverPort}/reset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer: ${token}` : "",
          },
          body: JSON.stringify({
            directory: currentDirectory,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setActionResult("Reset all changes successfully");
        setChangedFiles([]);
        setFileDiffs({});
        setSelectedFile(null);
      } else {
        setErrorMessage(data.error || "Failed to reset changes");
      }
    } catch (error) {
      console.error("Error resetting changes:", error);
      setErrorMessage("Error connecting to server");
    } finally {
      setActionLoading(false);
    }
  };

  // Commit changes
  const handleCommit = async () => {
    if (!currentDirectory || !commitMessage.trim()) return;

    setActionLoading(true);
    setActionResult(null);
    setErrorMessage(null);

    try {
      // Get auth token
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

      const response = await fetch(
        `http://${hostname}:${Constants.serverPort}/git/commit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer: ${token}` : "",
          },
          body: JSON.stringify({
            directory: currentDirectory,
            message: commitMessage,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setActionResult("Changes committed successfully");
        setCommitMessage("");

        // Clear the diffs section
        setSelectedFile(null);
        setFileDiffs({});

        // Refresh the Git status to update the file list
        fetchGitStatus();
      } else {
        setErrorMessage(data.error || "Failed to commit changes");
      }
    } catch (error) {
      console.error("Error committing changes:", error);
      setErrorMessage("Error connecting to server");
    } finally {
      setActionLoading(false);
    }
  };

  // Push changes
  const handlePush = async () => {
    if (!currentDirectory) return;

    setActionLoading(true);
    setActionResult(null);
    setErrorMessage(null);

    try {
      // Get auth token
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

      const response = await fetch(
        `http://${hostname}:${Constants.serverPort}/git/push`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer: ${token}` : "",
          },
          body: JSON.stringify({
            directory: currentDirectory,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setActionResult("Changes pushed successfully");
      } else {
        setErrorMessage(data.error || "Failed to push changes");
      }
    } catch (error) {
      console.error("Error pushing changes:", error);
      setErrorMessage("Error connecting to server");
    } finally {
      setActionLoading(false);
    }
  };

  // Create Pull Request
  const handleCreatePR = async () => {
    if (!currentDirectory) return;

    setActionLoading(true);
    setActionResult(null);
    setErrorMessage(null);

    try {
      // Get auth token
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

      // Use the commit message if provided, otherwise use a default title
      const prTitle = commitMessage.trim()
        ? commitMessage
        : "Create PR from current changes";

      const response = await fetch(
        `http://${hostname}:${Constants.serverPort}/git/create-pr`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer: ${token}` : "",
          },
          body: JSON.stringify({
            directory: currentDirectory,
            title: prTitle,
            body: "Created via Claude Go app",
          }),
        }
      );

      const data = await response.json();
      console.log("PR creation response:", data);

      if (data.success) {
        setActionResult("Pull request created successfully");
        setCommitMessage("");
      } else {
        setErrorMessage(data.error || "Failed to create PR");
        console.error("PR creation failed:", data.stderr || data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error creating PR:", error);
      setErrorMessage("Error connecting to server");
    } finally {
      setActionLoading(false);
    }
  };

  // Set global function reference
  useEffect(() => {
    global.fetchGitStatus = fetchGitStatus;
    return () => {
      global.fetchGitStatus = null;
    };
  }, [fetchGitStatus]);

  // Load Git status on component mount and when directory changes
  useEffect(() => {
    if (currentDirectory) {
      fetchGitStatus();
    }
  }, [currentDirectory, fetchGitStatus]);

  // Refresh git status when the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("Git tab focused, refreshing status");
      if (currentDirectory) {
        fetchGitStatus();
      }
      return () => {
        // Cleanup, if needed
      };
    }, [currentDirectory, fetchGitStatus])
  );

  // Helper function to get status color
  const getStatusColor = (statusType: string) => {
    switch (statusType) {
      case "modified_staged":
      case "modified_unstaged":
      case "modified_staged_and_unstaged":
        return "#CC7C5E"; // Orange
      case "added":
        return "#66BB6A"; // Green
      case "deleted":
      case "deleted_unstaged":
        return "#EF5350"; // Red
      case "untracked":
        return "#42A5F5"; // Blue
      default:
        return textColor;
    }
  };

  // Render status icon
  const renderStatusIcon = (statusType: string) => {
    const color = getStatusColor(statusType);
    let iconName: any = "circle.fill";

    switch (statusType) {
      case "modified_staged":
      case "modified_unstaged":
      case "modified_staged_and_unstaged":
        iconName = "arrow.triangle.2.circlepath";
        break;
      case "added":
        iconName = "plus.circle";
        break;
      case "deleted":
      case "deleted_unstaged":
        iconName = "minus.circle";
        break;
      case "untracked":
        iconName = "questionmark.circle";
        break;
    }

    return <IconSymbol name={iconName} size={16} color={color} />;
  };

  // Render each file item
  const renderFileItem = ({ item }: { item: GitFile }) => {
    const isSelected = selectedFile === item.path;

    return (
      <TouchableOpacity
        style={[
          styles.fileItem,
          { borderBottomColor: dividerColor },
          isSelected && { backgroundColor: "rgba(0, 125, 255, 0.1)" },
        ]}
        onPress={() => handleFileSelect(item.path)}
      >
        <View style={styles.fileRow}>
          <View style={styles.fileInfo}>
            {renderStatusIcon(item.status_type)}
            <ThemedText style={styles.fileName}>{item.path}</ThemedText>
          </View>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => handleResetFile(item.path)}
          >
            <IconSymbol
              name="trash"
              size={16}
              color={tintColor}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Render header with changed files title and reset all button
  const renderHeader = () => (
    <View style={styles.header}>
      <ThemedText style={styles.headerTitle}>
        Changed Files ({changedFiles.length})
      </ThemedText>
      {changedFiles.length > 0 && (
        <TouchableOpacity
          style={styles.resetAllButton}
          onPress={handleResetAll}
          disabled={actionLoading}
        >
          <ThemedText style={styles.resetAllButtonText}>Reset All</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );

  // Format the diff output for display
  const formatDiff = (diff: string) => {
    return diff.split("\n").map((line, index) => {
      let color = textColor;

      if (line.startsWith("+")) {
        color = "#66BB6A"; // Green for additions
      } else if (line.startsWith("-")) {
        color = "#EF5350"; // Red for deletions
      } else if (line.startsWith("@")) {
        color = "#42A5F5"; // Blue for line numbers
      }

      return (
        <Text key={index} style={[styles.diffLine, { color }]}>
          {line}
        </Text>
      );
    });
  };

  // Render the diff content
  const renderDiffContent = () => {
    if (!selectedFile) {
      return (
        <View style={styles.emptyDiffContainer}>
          <ThemedText style={styles.emptyText}>No file selected</ThemedText>
        </View>
      );
    }

    const diff = fileDiffs[selectedFile];

    if (!diff) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
          <ThemedText style={styles.loadingText}>Loading diff...</ThemedText>
        </View>
      );
    }

    if (diff.trim() === "") {
      return (
        <View style={styles.emptyDiffContainer}>
          <ThemedText style={styles.emptyText}>No changes detected in this file</ThemedText>
        </View>
      );
    }

    return (
      <ScrollView style={styles.diffContainer}>{formatDiff(diff)}</ScrollView>
    );
  };

  // Add keyboard dismiss functionality when tapping outside text input
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={100} // Adjust this value based on your UI
    >
      <ThemedView style={styles.container}>
        {/* Error message */}
        {errorMessage && (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
          </View>
        )}

        {/* Action result message */}
        {actionResult && (
          <View style={styles.resultContainer}>
            <ThemedText style={styles.resultText}>{actionResult}</ThemedText>
          </View>
        )}

        {/* Loading state */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator />
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={1}
            style={{ flex: 1 }}
            onPress={dismissKeyboard}
          >
            {/* Split view: Files list on top, diff view below */}
            <View style={styles.splitContainer}>
              {/* Files list */}
              <View style={styles.filesContainer}>
                {renderHeader()}
                {changedFiles.length > 0 ? (
                  <FlatList
                    data={changedFiles}
                    renderItem={renderFileItem}
                    keyExtractor={(item) => item.path}
                    style={styles.filesList}
                    keyboardShouldPersistTaps="handled"
                  />
                ) : (
                  <View style={styles.emptyContainer}>
                    <ThemedText style={styles.emptyText}>
                      No changes detected
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Diff view */}
              <View style={styles.diffWrapper}>
                <View style={[styles.diffHeader, { borderBottomColor: dividerColor }]}>
                  <ThemedText style={styles.diffTitle}>
                    {selectedFile ? `Diff: ${selectedFile}` : "Diff"}
                  </ThemedText>
                </View>
                {renderDiffContent()}
              </View>
            </View>

            {/* Commit actions at bottom */}
            <View style={styles.commitContainer}>
              <TextInput
                style={[
                  styles.commitInput,
                  { borderColor: "#CCCCCC80", color: textColor, backgroundColor },
                ]}
                placeholder="Write commit message..."
                placeholderTextColor="#999"
                value={commitMessage}
                onChangeText={setCommitMessage}
                multiline
              />
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.commitButton]}
                  onPress={handleCommit}
                  disabled={
                    !commitMessage.trim() ||
                    actionLoading ||
                    changedFiles.length === 0
                  }
                >
                  {actionLoading ? (
                    <ActivityIndicator />
                  ) : (
                    <Text style={styles.actionButtonText}>Commit</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.pushButton]}
                  onPress={handlePush}
                  disabled={actionLoading || changedFiles.length > 0}
                >
                  <Text style={styles.actionButtonText}>Push</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.prButton]}
                  onPress={handleCreatePR}
                  disabled={actionLoading} // Removed message requirement to create PR from current commits
                >
                  <Text style={styles.actionButtonText}>Create PR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  branchContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  branchText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: "#FFCDD2",
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: "#B71C1C",
    fontSize: 14,
  },
  resultContainer: {
    backgroundColor: "#C8E6C9",
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  resultText: {
    color: "#1B5E20",
    fontSize: 14,
  },
  splitContainer: {
    flex: 1,
    flexDirection: "column",
  },
  filesContainer: {
    height: "40%",
    marginBottom: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  resetAllButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: "#EF5350",
  },
  resetAllButtonText: {
    color: "white",
    fontSize: 14,
  },
  filesList: {
    flex: 1,
  },
  fileItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fileInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  fileName: {
    marginLeft: 10,
    fontSize: 14,
  },
  resetButton: {
    padding: 8,
  },
  diffWrapper: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  diffHeader: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  diffTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  diffContainer: {
    flex: 1,
    padding: 8,
  },
  diffLine: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    marginVertical: 1,
  },
  emptyDiffContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  commitContainer: {
    marginTop: 16,
  },
  commitInput: {
    height: 80,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    textAlignVertical: "top",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  commitButton: {
    backgroundColor: "#66BB6A",
  },
  pushButton: {
    backgroundColor: "#007AFF",
  },
  prButton: {
    backgroundColor: "#007AFF",
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
  },
});
