import Constants from "expo-constants";
import * as Application from "expo-application";
import { useMutation } from "convex/react";
import { Star } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "@/convex/_generated/api";
import { useTheme } from "@/context/ThemeContext";

type FeedbackCategory = "bug" | "feature_request" | "general_experience" | "praise";
type Props = { visible: boolean; onDismiss: () => void; onSubmitted: () => void };
const categories: { value: FeedbackCategory; label: string }[] = [
  { value: "general_experience", label: "Experience" },
  { value: "feature_request", label: "Feature" },
  { value: "bug", label: "Bug" },
  { value: "praise", label: "Praise" },
];

export default function ReviewCaptureModal({ visible, onDismiss, onSubmitted }: Props) {
  const { colors } = useTheme();
  const submitReview = useMutation(api.reviews.submitReview);
  const [rating, setRating] = useState<number | null>(null);
  const [category, setCategory] = useState<FeedbackCategory>("general_experience");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isLowRating = !!rating && rating <= 3;
  const storeUrl = Platform.OS === "android"
    ? process.env.EXPO_PUBLIC_PLAY_STORE_URL || "market://details?id=com.jwfca.bluom"
    : process.env.EXPO_PUBLIC_APP_STORE_URL;

  const reset = () => { setRating(null); setCategory("general_experience"); setComment(""); setError(""); };
  const dismiss = () => { reset(); onDismiss(); };
  const submit = async () => {
    if (!rating) { setError("Choose a rating to continue."); return; }
    if (isLowRating && !comment.trim()) { setError("Please share a short note so we can improve."); return; }
    setSubmitting(true); setError("");
    try {
      await submitReview({
        rating,
        feedbackCategory: category,
        comment: comment.trim() || undefined,
        appVersion: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "unknown",
        platform: Platform.OS,
      });
      reset();
      onSubmitted();
    } catch (cause: any) {
      setError(cause?.message ?? "We couldn't send your feedback. Please try again.");
    } finally { setSubmitting(false); }
  };
  const openStore = () => {
    if (storeUrl) Linking.openURL(storeUrl).catch(() => setError("Couldn't open the app store right now."));
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={dismiss}>
    <View style={styles.backdrop}><View style={styles.sheet}>
      <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.title}>{rating && rating >= 4 ? "That made our day" : "How is Bluom feeling?"}</Text>
        <Text style={styles.subtitle}>{rating && rating >= 4 ? "Thanks for sharing the love. Your feedback helps Bluom grow." : "A quick rating helps us make your wellness space better."}</Text>
        <View style={styles.stars}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} onPress={() => { setRating(value); setError(""); }} accessibilityRole="button" accessibilityLabel={`${value} star rating`} style={styles.starButton}><Star size={36} fill={rating && value <= rating ? colors.primary : "transparent"} color={rating && value <= rating ? colors.primary : colors.border} /></Pressable>)}</View>
        {rating ? <>
          <Text style={styles.sectionLabel}>{isLowRating ? "What should we improve?" : "What stood out?"}</Text>
          <View style={styles.chips}>{categories.map((item) => <Pressable key={item.value} onPress={() => setCategory(item.value)} style={[styles.chip, category === item.value && styles.chipSelected]}><Text style={[styles.chipText, category === item.value && styles.chipTextSelected]}>{item.label}</Text></Pressable>)}</View>
          <TextInput value={comment} onChangeText={(value) => setComment(value.slice(0, 500))} placeholder={isLowRating ? "Tell us what happened" : "Anything else you'd like to share?"} placeholderTextColor={colors.textMuted} multiline maxLength={500} textAlignVertical="top" style={styles.comment} />
          <Text style={styles.counter}>{comment.length}/500</Text>
          {rating >= 4 && storeUrl ? <Pressable onPress={openStore} style={styles.storeButton}><Text style={styles.storeText}>Leave a public review</Text></Pressable> : null}
        </> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable onPress={submit} disabled={submitting} style={[styles.submit, (!rating || submitting) && styles.submitDisabled]}>{submitting ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.submitText}>Submit</Text>}</Pressable>
        <View style={styles.actions}><Pressable onPress={dismiss} disabled={submitting}><Text style={styles.secondary}>Remind me later</Text></Pressable><Pressable onPress={dismiss} disabled={submitting}><Text style={styles.secondary}>No thanks</Text></Pressable></View>
      </ScrollView>
    </View></View>
  </Modal>;
}

const createStyles = (c: ReturnType<typeof useTheme>["colors"]) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }, sheet: { maxHeight: "88%", backgroundColor: c.surface, borderTopLeftRadius: 8, borderTopRightRadius: 8 }, content: { padding: 24, paddingBottom: 34 }, title: { color: c.text, fontSize: 22, fontWeight: "700", textAlign: "center" }, subtitle: { color: c.textMuted, fontSize: 15, lineHeight: 21, textAlign: "center", marginTop: 8 }, stars: { flexDirection: "row", justifyContent: "center", marginVertical: 24 }, starButton: { padding: 4 }, sectionLabel: { color: c.text, fontSize: 15, fontWeight: "700", marginBottom: 10 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }, chip: { borderWidth: 1, borderColor: c.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 }, chipSelected: { borderColor: c.primary, backgroundColor: c.surfaceMuted }, chipText: { color: c.textMuted, fontWeight: "600" }, chipTextSelected: { color: c.primary }, comment: { minHeight: 96, borderWidth: 1, borderColor: c.border, borderRadius: 6, color: c.text, fontSize: 16, padding: 12 }, counter: { color: c.textMuted, fontSize: 12, textAlign: "right", marginTop: 4 }, storeButton: { alignItems: "center", marginTop: 16 }, storeText: { color: c.primary, fontWeight: "700" }, error: { color: "#DC2626", marginTop: 12, textAlign: "center" }, submit: { alignItems: "center", justifyContent: "center", minHeight: 50, marginTop: 18, borderRadius: 6, backgroundColor: c.primary }, submitDisabled: { opacity: 0.45 }, submitText: { color: c.onPrimary, fontWeight: "700", fontSize: 16 }, actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 }, secondary: { color: c.textMuted, fontWeight: "600" },
});