import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, type ThemeColors } from '@/context/ThemeContext';
import { getFlagEmoji } from './FoodSearchModal';

interface FoodDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  item: any | null; // Can be a customFood or recipe
  itemType: 'food' | 'recipe' | null;
  onLog: (item: any) => void;
  hideLogButton?: boolean;
}

export default function FoodDetailsModal({ visible, onClose, item, itemType, onLog, hideLogButton = false }: FoodDetailsModalProps) {
  const { t, i18n } = useTranslation();
  const { colors: themeColors } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const currentLang = i18n.language || 'en';

  if (!item) return null;

  const getLocalizedName = (nameField: any) => {
    if (typeof nameField !== 'object' || nameField === null) return nameField || 'Food';
    return nameField[currentLang] || nameField.en || Object.values(nameField)[0] || 'Food';
  };

  const name = itemType === 'recipe' ? item.name || item.title : getLocalizedName(item.name);
  const brand = item.brand ? `${item.brand} • ` : '';
  const servingSize = itemType === 'recipe' ? `1 Serving` : (item.servingSize || '100g');
  
  const macros = itemType === 'recipe' ? (item.nutrition?.perServing || item.nutrition) : (item.macros || item);
  
  // Safe parsing
  const cal = Math.round(macros?.calories ?? 0);
  const p = Math.round(macros?.protein ?? 0);
  const c = Math.round(macros?.carbs ?? 0);
  const f = Math.round(macros?.fat ?? 0);

  const fiber = macros?.fiber;
  const sugar = macros?.sugar;
  
  const satFat = macros?.saturatedFat;
  const polyFat = macros?.polyunsaturatedFat;
  const monoFat = macros?.monounsaturatedFat;
  const transFat = macros?.transFat;

  const totalMacros = p + c + f || 1;
  const pPct = Math.round((p / totalMacros) * 100);
  const cPct = Math.round((c / totalMacros) * 100);
  const fPct = Math.round((f / totalMacros) * 100);

  const renderMacroRow = (label: string, val: number | undefined, color: string, isSubItem = false) => {
    if (val === undefined || val === null) return null;
    return (
      <View style={[styles.macroRow, isSubItem && styles.subMacroRow]}>
        <View style={styles.macroLabelWrap}>
          <View style={[styles.macroDot, { backgroundColor: color }]} />
          <Text style={[styles.macroLabelText, isSubItem && styles.subMacroLabelText]}>{label}</Text>
        </View>
        <Text style={[styles.macroValText, isSubItem && styles.subMacroValText]}>{Math.round(val)}g</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>Food Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Main Info */}
          <View style={styles.infoCard}>
             {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
             ) : (
                <View style={styles.iconPlaceholder}>
                   <Ionicons name={itemType === 'recipe' ? "restaurant" : "nutrition"} size={40} color="#3b82f6" />
                </View>
             )}
             
             <View style={styles.titleSection}>
                <Text style={styles.foodName}>{name}</Text>
                <Text style={styles.foodSub}>{brand}{servingSize}</Text>
                
                <View style={styles.badgesRow}>
                   {item.countryCode ? (
                      <View style={[styles.badge, { borderColor: '#3b82f6', backgroundColor: '#eff6ff' }]}>
                         <Text style={[styles.badgeText, { color: '#2563eb' }]}>
                            {getFlagEmoji(item.countryCode)} {item.countryCode.toUpperCase()}
                         </Text>
                      </View>
                   ) : itemType === 'recipe' ? (
                      <View style={[styles.badge, { borderColor: '#8b5cf6', backgroundColor: '#f5f3ff' }]}>
                         <Text style={[styles.badgeText, { color: '#7c3aed' }]}>Recipe</Text>
                      </View>
                   ) : !item.isVerified ? (
                      <View style={[styles.badge, { borderColor: '#10b981', backgroundColor: '#ecfdf5' }]}>
                         <Text style={[styles.badgeText, { color: '#059669' }]}>Saved</Text>
                      </View>
                   ) : (
                      <View style={styles.badge}>
                         <Text style={styles.badgeText}>🌐 Global</Text>
                      </View>
                   )}
                </View>
             </View>
          </View>

          {/* Calorie & Top-Level Macros */}
          <View style={styles.caloriesCard}>
             <Text style={styles.calText}>{cal}</Text>
             <Text style={styles.calLabel}>Calories</Text>
          </View>

          <View style={styles.macroBarsRow}>
             <View style={styles.macroBarBox}>
               <Text style={styles.macroBarNum}>{p}g</Text>
               <View style={styles.macroBarTrack}>
                 <View style={[styles.macroBarFill, { backgroundColor: '#fca5a5', height: `${pPct}%` }]} />
               </View>
               <Text style={styles.macroBarLabel}>Protein</Text>
             </View>
             <View style={styles.macroBarBox}>
               <Text style={styles.macroBarNum}>{c}g</Text>
               <View style={styles.macroBarTrack}>
                 <View style={[styles.macroBarFill, { backgroundColor: '#93c5fd', height: `${cPct}%` }]} />
               </View>
               <Text style={styles.macroBarLabel}>Carbs</Text>
             </View>
             <View style={styles.macroBarBox}>
               <Text style={styles.macroBarNum}>{f}g</Text>
               <View style={styles.macroBarTrack}>
                 <View style={[styles.macroBarFill, { backgroundColor: '#fde047', height: `${fPct}%` }]} />
               </View>
               <Text style={styles.macroBarLabel}>Fat</Text>
             </View>
          </View>

          {/* Detailed Breakdown */}
          <View style={styles.breakdownCard}>
             <Text style={styles.breakdownTitle}>Nutritional Breakdown</Text>
             
             {/* Protein */}
             {renderMacroRow('Protein', p, '#fca5a5')}

             <View style={styles.divider} />

             {/* Carbs */}
             {renderMacroRow('Total Carbs', c, '#93c5fd')}
             {renderMacroRow('Dietary Fiber', fiber, '#bfdbfe', true)}
             {renderMacroRow('Sugars', sugar, '#bfdbfe', true)}

             <View style={styles.divider} />

             {/* Fat */}
             {renderMacroRow('Total Fat', f, '#fde047')}
             {renderMacroRow('Saturated Fat', satFat, '#fef08a', true)}
             {renderMacroRow('Polyunsaturated Fat', polyFat, '#fef08a', true)}
             {renderMacroRow('Monounsaturated Fat', monoFat, '#fef08a', true)}
             {renderMacroRow('Trans Fat', transFat, '#fef08a', true)}
          </View>
        </ScrollView>

        {!hideLogButton && (
          <View style={styles.footer}>
             <TouchableOpacity 
                style={styles.addBtn}
                activeOpacity={0.8}
                onPress={() => {
                   onLog(item);
                   onClose();
                }}
             >
                <Ionicons name="add-circle" size={24} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.addBtnText}>Add to Diary</Text>
             </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 16,
    marginRight: 16,
  },
  iconPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  titleSection: {
    flex: 1,
  },
  foodName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  foodSub: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  caloriesCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  calText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0f172a',
  },
  calLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 4,
  },
  macroBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  macroBarBox: {
    alignItems: 'center',
    flex: 1,
  },
  macroBarNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  macroBarTrack: {
    width: 12,
    height: 100,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    justifyContent: 'flex-end',
    marginBottom: 8,
    overflow: 'hidden',
  },
  macroBarFill: {
    width: '100%',
    borderRadius: 6,
  },
  macroBarLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  breakdownCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  subMacroRow: {
    paddingLeft: 24,
    paddingVertical: 6,
  },
  macroLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  macroLabelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  subMacroLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  macroValText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  subMacroValText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
  footer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  addBtn: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
