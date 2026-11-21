import React, { createContext, useContext } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { Language } from "../core/types";
export const colors = {
  background: "#0b1310",
  surface: "#142019",
  raised: "#1c2c21",
  border: "#304135",
  ink: "#f1f5e9",
  muted: "#b0bdaf",
  primary: "#bafa70",
  danger: "#ffb7ac",
  warning: "#ffd08b",
};
export const Locale = createContext<Language>("ar");
export function useWords() {
  const language = useContext(Locale);
  return {
    language,
    ar: language === "ar",
    t: (a: string, e: string) => (language === "ar" ? a : e),
  };
}
export function Txt({
  children,
  small = false,
  title = false,
  color,
  latin = false,
}: {
  children: React.ReactNode;
  small?: boolean;
  title?: boolean;
  color?: string;
  latin?: boolean;
}) {
  const { ar } = useWords();
  return (
    <Text
      style={[
        styles.text,
        small && styles.small,
        title && styles.title,
        {
          textAlign: ar ? "right" : "left",
          writingDirection: latin ? "ltr" : ar ? "rtl" : "ltr",
          color: color || colors.ink,
        },
        latin && styles.code,
      ]}
    >
      {children}
    </Text>
  );
}
export function Panel({ children }: { children: React.ReactNode }) {
  return <View style={styles.panel}>{children}</View>;
}
export function Button({
  children,
  onPress,
  primary = false,
  disabled = false,
  busy = false,
  testID,
}: {
  children: React.ReactNode;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  busy?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        primary && styles.primary,
        (disabled || busy) && { opacity: 0.45 },
        pressed && { opacity: 0.7 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={primary ? colors.background : colors.primary} />
      ) : (
        <Text style={[styles.buttonText, primary && { color: colors.background }]}>{children}</Text>
      )}
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { ar } = useWords();
  return (
    <View style={styles.field}>
      <Txt>{label}</Txt>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        style={[styles.input, { textAlign: ar ? "right" : "left" }, props.style]}
      />
    </View>
  );
}
export function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Txt small color={colors.muted}>
        {label}
      </Txt>
      <Txt>{value}</Txt>
    </View>
  );
}
export function Notice({
  children,
  danger = false,
}: {
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.notice, danger && { borderColor: colors.danger }]}
    >
      <Txt small color={danger ? colors.danger : colors.warning}>
        {children}
      </Txt>
    </View>
  );
}
export const styles = StyleSheet.create({
  text: { fontFamily: "Cairo", fontSize: 18, lineHeight: 31, color: colors.ink, flexShrink: 1 },
  small: { fontSize: 14, lineHeight: 25 },
  title: { fontFamily: "CairoBold", fontSize: 29, lineHeight: 45 },
  code: {
    fontFamily: undefined,
    fontVariant: ["tabular-nums"],
    fontSize: 25,
    lineHeight: 38,
    textAlign: "center",
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 19,
    gap: 13,
  },
  button: {
    backgroundColor: colors.raised,
    borderRadius: 18,
    minHeight: 64,
    paddingHorizontal: 15,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  buttonText: {
    color: colors.ink,
    fontFamily: "CairoBold",
    fontSize: 18,
    textAlign: "center",
    lineHeight: 29,
    flexShrink: 1,
  },
  field: { gap: 7, flexShrink: 1 },
  input: {
    minHeight: 62,
    backgroundColor: colors.background,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.ink,
    fontSize: 18,
    fontFamily: "Cairo",
  },
  fact: { gap: 1, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 },
  notice: {
    borderStartWidth: 4,
    borderColor: colors.warning,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
});
