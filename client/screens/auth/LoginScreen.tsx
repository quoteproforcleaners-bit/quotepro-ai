import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
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

type Mode = "login" | "register";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { login, register, loginWithApple, refreshAuth } = useAuth();

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
      if (result.type === "success" || result.type === "dismiss") {
        await refreshAuth();
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
            paddingTop: insets.top + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.branding}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary }]}>
            <Feather name="file-text" size={32} color="#FFFFFF" />
          </View>
          <ThemedText type="h1" style={styles.appName}>
            QuotePro
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.tagline, { color: theme.textSecondary }]}
          >
            Professional quoting for cleaning businesses
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
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={BorderRadius.lg}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        ) : null}

        <Pressable
          style={[styles.googleButton, { borderColor: theme.border }]}
          onPress={handleGoogleSignIn}
          testID="button-google-signin"
        >
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            Continue with Google
          </ThemedText>
        </Pressable>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <ThemedText
            type="small"
            style={[styles.dividerText, { color: theme.textSecondary }]}
          >
            or
          </ThemedText>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        {mode === "register" ? (
          <Input
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            leftIcon="user"
            testID="input-name"
          />
        ) : null}

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail"
          testID="input-email"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
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
              {mode === "login" ? "Sign In" : "Create Account"}
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
            {mode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
            {mode === "login" ? "Sign Up" : "Sign In"}
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
    marginBottom: Spacing["3xl"],
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  tagline: {
    textAlign: "center",
  },
  errorContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  appleButton: {
    width: "100%",
    height: 52,
    marginBottom: Spacing.md,
  },
  googleButton: {
    width: "100%",
    height: 52,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
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
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  switchMode: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.lg,
  },
});
