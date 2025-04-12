import { ColorSchemeName, useColorScheme as _useColorScheme } from 'react-native';
import { useAppContext } from '@/contexts/AppContext';

export function useColorScheme(): NonNullable<ColorSchemeName> {
  const { themePreference } = useAppContext();
  const systemColorScheme = _useColorScheme();

  // If themePreference is 'auto', use the system's color scheme
  // Otherwise, use the explicitly set preference
  if (themePreference === 'auto') {
    return systemColorScheme ?? 'light';
  }

  return themePreference;
}
