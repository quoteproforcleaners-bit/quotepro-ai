import React from "react";
import { View, StyleSheet, ActivityIndicator, Alert, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { documentDirectory, copyAsync } from "expo-file-system/legacy";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ProposalAttachment, ProposalAttachments } from "../types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface AttachmentSectionProps {
  attachments: ProposalAttachments;
  onUpdate: (attachments: ProposalAttachments) => void;
}

type AttachmentKey = "coi" | "w9";

const ATTACHMENT_CONFIG: { key: AttachmentKey; label: string; icon: "shield" | "file-text" }[] = [
  { key: "coi", label: "Certificate of Insurance (COI)", icon: "shield" },
  { key: "w9", label: "W-9", icon: "file-text" },
];

export function AttachmentSection({ attachments, onUpdate }: AttachmentSectionProps) {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = React.useState<AttachmentKey | null>(null);

  const pickFile = async (key: AttachmentKey) => {
    try {
      setLoading(key);
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setLoading(null);
        return;
      }

      const asset = result.assets[0];

      if (asset.size && asset.size > MAX_FILE_SIZE) {
        Alert.alert("File Too Large", "Please use a file smaller than 10 MB.");
        setLoading(null);
        return;
      }

      let localUri = asset.uri;
      if (Platform.OS === "ios" && documentDirectory) {
        const fileName = asset.name || `attachment_${key}_${Date.now()}`;
        const destUri = documentDirectory + fileName;
        try {
          await copyAsync({ from: asset.uri, to: destUri });
          localUri = destUri;
        } catch {
          // use original uri
        }
      }

      const attachment: ProposalAttachment = {
        uri: localUri,
        name: asset.name || `attachment_${key}`,
        mimeType: asset.mimeType || "application/octet-stream",
        size: asset.size,
      };

      onUpdate({ ...attachments, [key]: attachment });
    } catch (err: any) {
      Alert.alert("Error", "Could not select file. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const removeFile = (key: AttachmentKey) => {
    const updated = { ...attachments };
    delete updated[key];
    onUpdate(updated);
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View>
      <SectionHeader title="Attachments (Optional)" />
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.md, marginTop: -Spacing.sm }}>
        Attachments will be appended to the end of your proposal PDF.
      </ThemedText>

      {ATTACHMENT_CONFIG.map(({ key, label, icon }) => {
        const file = attachments[key];
        const isLoading = loading === key;
        const isPdf = file?.mimeType === "application/pdf";

        return (
          <Card key={key} style={styles.attachmentCard}>
            <View style={styles.attachmentRow}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? `${theme.primary}20` : `${theme.primary}08` }]}>
                <Feather name={icon} size={20} color={theme.primary} />
              </View>
              <View style={styles.attachmentInfo}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>{label}</ThemedText>
                {file ? (
                  <View style={styles.fileInfo}>
                    <Feather name={isPdf ? "file" : "image"} size={12} color={theme.success} />
                    <ThemedText type="caption" style={{ color: theme.success, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                      {file.name}
                      {file.size ? ` (${formatSize(file.size)})` : ""}
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>Not attached</ThemedText>
                )}
              </View>
            </View>

            {isLoading ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: Spacing.sm }} />
            ) : (
              <View style={styles.buttonRow}>
                {file ? (
                  <>
                    <Button
                      mode="outlined"
                      compact
                      onPress={() => pickFile(key)}
                      style={styles.actionBtn}
                      testID={`button-replace-${key}`}
                    >
                      Replace
                    </Button>
                    <Button
                      mode="text"
                      compact
                      onPress={() => removeFile(key)}
                      style={styles.actionBtn}
                      testID={`button-remove-${key}`}
                    >
                      Remove
                    </Button>
                  </>
                ) : (
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => pickFile(key)}
                    style={styles.actionBtn}
                    testID={`button-add-${key}`}
                  >
                    Add File
                  </Button>
                )}
              </View>
            )}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  attachmentCard: {
    marginBottom: Spacing.sm,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  attachmentInfo: {
    flex: 1,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionBtn: {
    minWidth: 80,
  },
});
