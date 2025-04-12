import { useState, useEffect } from "react";
import { Platform, PermissionsAndroid } from "react-native";

type Permission = typeof PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;

export const usePermissionChecker = () => {
  const [permissionStatus, setPermissionStatus] = useState<{
    [key: string]: boolean | "unavailable";
  }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    setIsLoading(true);

    const permissionsToCheck = [
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      // Add other permissions as needed
    ];

    const status: { [key: string]: boolean | "unavailable" } = {};

    if (Platform.OS === "android") {
      try {
        for (const permission of permissionsToCheck) {
          try {
            const result = await PermissionsAndroid.check(permission);
            status[permission] = result;
          } catch (error) {
            console.error(`Error checking permission ${permission}:`, error);
            status[permission] = false;
          }
        }
      } catch (error) {
        console.error("Error checking permissions:", error);
      }
    } else {
      // iOS doesn't have a direct way to check permissions without requesting them
      // So we'll mark these as unavailable
      for (const permission of permissionsToCheck) {
        status[permission] = "unavailable";
      }
    }

    setPermissionStatus(status);
    setIsLoading(false);
  };

  const requestPermission = async (permission: Permission) => {
    if (Platform.OS !== "android") {
      return false;
    }

    try {
      const granted = await PermissionsAndroid.request(permission);
      const result = granted === PermissionsAndroid.RESULTS.GRANTED;

      // Update our status
      setPermissionStatus((prev) => ({
        ...prev,
        [permission]: result,
      }));

      return result;
    } catch (error) {
      console.error(`Error requesting permission ${permission}:`, error);
      return false;
    }
  };

  return {
    permissionStatus,
    isLoading,
    checkPermissions,
    requestPermission,
  };
};
