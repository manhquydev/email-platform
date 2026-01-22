import { memo, useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Debounced search bar component */
function SearchBarComponent({ value, onChange, placeholder = 'Tim kiem...' }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue]);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color="#9CA3AF" style={styles.icon} />
      <TextInput
        style={styles.input}
        value={localValue}
        onChangeText={setLocalValue}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {localValue.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Ionicons name="close-circle" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

export const SearchBar = memo(SearchBarComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  icon: { marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: { padding: 4 },
});
