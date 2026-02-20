import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { getApiUrl } from "@/lib/query-client";
import * as WebBrowser from "expo-web-browser";

interface AuthGateModalProps {
  visible: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
  message?: string;
}

export default function AuthGateModal({ visible, onClose, onAuthenticated, message }: AuthGateModalProps) {
  const { theme } = useTheme();
  const { login, register, loginWithApple, setAuthData, refreshAuth } = useAuth();
  const { t } = useLanguage();

  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t.authGate.fillAllFields);
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
      onAuthenticated();
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
        setError("Apple sign-in failed");
        return;
      }
      await loginWithApple({
        identityToken: credential.identityToken,
        user: credential.user,
        fullName: credential.fullName,
        email: credential.email || undefined,
      });
      onAuthenticated();
    } catch (err: any) {
      if (err.code === "ERR_REQUEST_CANCELED") return;
      setError(err.message || "Apple sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      const baseUrl = getApiUrl();
      const startRes = await fetch(new URL("/api/auth/google/start", baseUrl), { credentials: "include" });
      if (!startRes.ok) {
        setError("Google sign-in is not available");
        return;
      }
      const { url } = await startRes.json();
      const result = await WebBrowser.openAuthSessionAsync(url, `quotepro://auth/google/callback`);
      if (result.type === "success" && result.url) {
        const urlObj = new URL(result.url);
        const token = urlObj.searchParams.get("token");
        if (token) {
          const verifyRes = await fetch(new URL(`/api/auth/google/verify?token=${token}`, baseUrl), { credentials: "include" });
          if (verifyRes.ok) {
            const data = await verifyRes.json();
            setAuthData(data.user, data.needsOnboarding);
            onAuthenticated();
          } else {
            setError("Google verification failed");
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError("");
    setEmail("");
    setPassword("");
    setName("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle" style={{ fontWeight: "700" }}>
                {t.authGate.title}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
                {message || t.authGate.subtitle}
              </ThemedText>
            </View>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Feather name="x" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: `${theme.error}15` }]}>
              <ThemedText type="small" style={{ color: theme.error }}>{error}</ThemedText>
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
            testID="authgate-button-google"
          >
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {t.login.continueWithGoogle}
            </ThemedText>
          </Pressable>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginHorizontal: Spacing.md }}>
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
              testID="authgate-input-name"
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
            testID="authgate-input-email"
          />

          <Input
            label={t.login.password}
            value={password}
            onChangeText={setPassword}
            placeholder={t.login.passwordPlaceholder}
            secureTextEntry
            leftIcon="lock"
            testID="authgate-input-password"
          />

          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.primary }, loading && { opacity: 0.6 }]}
            onPress={handleEmailAuth}
            disabled={loading}
            testID="authgate-button-submit"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                {mode === "login" ? t.login.signIn : t.login.createAccount}
              </ThemedText>
            )}
          </Pressable>

          <Pressable
            style={styles.switchMode}
            onPress={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          >
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {mode === "login" ? t.login.noAccount : t.login.hasAccount}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
              {mode === "login" ? t.login.signUp : t.login.signIn}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing["4xl"],
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.xl,
  },
  errorBox: {
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
    gap: 4,
  },
});
