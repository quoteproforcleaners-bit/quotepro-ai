import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Image,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Input } from "@/components/Input";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { Feather } from "@expo/vector-icons";
import { useLanguage } from "@/context/LanguageContext";
import { LANGUAGE_LABELS, type Language } from "@/i18n";

type Mode = "login" | "register";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const { theme } = useTheme();
  const { login, register, loginWithApple, setAuthData, refreshAuth } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (mode === "register") {
        await register(email.trim(), password, name.trim() || undefined);
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      const msg = err.message || "Something went wrong";
      const cleanMsg = msg.includes(":") ? msg.split(": ").slice(1).join(": ") : msg;
      try {
        const parsed = JSON.parse(cleanMsg);
        setError(parsed.message || cleanMsg);
      } catch {
        setError(cleanMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      setError("");

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        setError("Apple sign-in failed - no token received");
        return;
      }

      await loginWithApple({
        identityToken: credential.identityToken,
        user: credential.user,
        fullName: credential.fullName,
        email: credential.email || undefined,
      });
    } catch (err: any) {
      if (err.code === "ERR_REQUEST_CANCELED") {
        return;
      }
      const msg = err.message || "Apple sign-in failed";
      const cleanMsg = msg.includes(":") ? msg.split(": ").slice(1).join(": ") : msg;
      try {
        const parsed = JSON.parse(cleanMsg);
        setError(parsed.message || cleanMsg);
      } catch {
        setError(cleanMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      const baseUrl = getApiUrl();
      const startRes = await fetch(new URL("/api/auth/google/start", baseUrl), {
        credentials: "include",
      });
      if (!startRes.ok) {
        const data = await startRes.json().catch(() => ({ message: "Failed to start Google sign-in" }));
        setError(data.message || "Google sign-in is not available");
        return;
      }
      const { url } = await startRes.json();
      const result = await WebBrowser.openAuthSessionAsync(url, "quotepro://auth-callback");
      if (result.type === "success" && result.url) {
        const urlObj = new URL(result.url);
        const token = urlObj.searchParams.get("token");
        if (token) {
          const exchangeRes = await fetch(new URL("/api/auth/exchange-token", baseUrl), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ token }),
          });
          if (exchangeRes.ok) {
            const data = await exchangeRes.json();
            setAuthData(data.user, data.needsOnboarding);
          } else {
            setError("Google sign-in failed. Please try again.");
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior="padding"
    >
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.md,
            paddingBottom: insets.bottom + Spacing.sm,
          },
          ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" as const }] : []),
        ]}
      >

        <View style={styles.languageRow}>
          {(["en", "es", "pt", "ru"] as Language[]).map((lang) => (
            <Pressable
              key={lang}
              onPress={() => setLanguage(lang)}
              style={[
                styles.languageChip,
                {
                  backgroundColor: language === lang ? theme.primary : "transparent",
                  borderColor: language === lang ? theme.primary : theme.border,
                },
              ]}
              testID={`button-lang-${lang}`}
            >
              <ThemedText
                type="small"
                style={{
                  color: language === lang ? "#FFFFFF" : theme.textSecondary,
                  fontWeight: language === lang ? "700" : "500",
                }}
              >
                {LANGUAGE_LABELS[lang]}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.branding}>
          <Image
            source={require('../../../assets/images/icon.png')}
            style={styles.appLogo}
          />
          <ThemedText type="h2" style={styles.appName}>
            QuotePro
          </ThemedText>
        </View>

        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: theme.error + "15" }]}>
            <ThemedText type="small" style={{ color: theme.error }}>
              {error}
            </ThemedText>
          </View>
        ) : null}

        {Platform.OS === "ios" ? (
          <View style={[styles.appleButtonContainer, { borderColor: theme.border }]}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={BorderRadius.lg - 1}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          </View>
        ) : null}

        <Pressable
          style={[styles.googleButton, { borderColor: theme.border }]}
          onPress={handleGoogleSignIn}
          testID="button-google-signin"
        >
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            {t.login.continueWithGoogle}
          </ThemedText>
        </Pressable>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <ThemedText
            type="small"
            style={[styles.dividerText, { color: theme.textSecondary }]}
          >
            {t.common.or}
          </ThemedText>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        {mode === "register" ? (
          <Input
            label={t.login.fullName}
            value={name}
            onChangeText={setName}
            placeholder={t.login.namePlaceholder}
            leftIcon="user"
            testID="input-name"
          />
        ) : null}

        <Input
          label={t.login.email}
          value={email}
          onChangeText={setEmail}
          placeholder={t.login.emailPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail"
          testID="input-email"
        />

        <Input
          label={t.login.password}
          value={password}
          onChangeText={setPassword}
          placeholder={t.login.passwordPlaceholder}
          secureTextEntry
          leftIcon="lock"
          testID="input-password"
        />

        <Pressable
          style={[
            styles.primaryButton,
            { backgroundColor: theme.primary },
            loading && { opacity: 0.6 },
          ]}
          onPress={handleEmailAuth}
          disabled={loading}
          testID="button-email-auth"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText
              type="body"
              style={{ color: "#FFFFFF", fontWeight: "600", textAlign: "center" }}
            >
              {mode === "login" ? t.login.signIn : t.login.createAccount}
            </ThemedText>
          )}
        </Pressable>

        <Pressable
          style={styles.switchMode}
          onPress={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
          testID="button-switch-mode"
        >
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {mode === "login" ? t.login.noAccount : t.login.hasAccount}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
            {mode === "login" ? t.login.signUp : t.login.signIn}
          </ThemedText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: "center",
  },
  branding: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  appLogo: {
    width: 60,
    height: 60,
    borderRadius: 14,
    marginBottom: Spacing.sm,
  },
  appName: {
    fontSize: 26,
  },
  errorContainer: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  appleButtonContainer: {
    width: "100%",
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  appleButton: {
    width: "100%",
    height: 48,
  },
  googleButton: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
  },
  primaryButton: {
    width: "100%",
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  switchMode: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  languageRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  languageChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
});
