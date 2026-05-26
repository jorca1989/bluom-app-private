import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

// ─── Memoized search result row ─────────────────────────────
const SearchResultItem = React.memo(({ food, onAdd }: { food: any; onAdd: () => void }) => (
    <TouchableOpacity style={styles.foodItem} onPress={onAdd}>
        {food.thumbnail ? (
            <Image source={{ uri: food.thumbnail }} style={styles.foodItemThumbnail} />
        ) : (
            <View style={styles.foodItemThumbnailPlaceholder}>
                <Ionicons name="nutrition" size={20} color="#94a3b8" />
            </View>
        )}
        <View style={styles.foodItemContent}>
            <Text style={styles.foodItemName}>
                {typeof food.name === 'object'
                    ? (food.name as any).en || 'Food'
                    : food.name}
            </Text>
            <Text style={styles.foodItemBrand}>{food.brand ?? '—'} • {food.servingSize ?? '100g'}</Text>
            <Text style={styles.foodItemNutrition}>
                {Math.round(food.macros?.calories ?? food.calories ?? 0)} cal • {Math.round(food.macros?.protein ?? food.protein ?? 0)}g protein • {Math.round(food.macros?.carbs ?? food.carbs ?? 0)}g carbs • {Math.round(food.macros?.fat ?? food.fat ?? 0)}g fat
            </Text>
        </View>
        <View style={styles.foodItemAdd}>
            <Ionicons name="add-circle" size={24} color="#3b82f6" />
        </View>
    </TouchableOpacity>
));

// ─── Props ──────────────────────────────────────────────────
interface FoodSearchSectionProps {
    userId: string;
    onSelectFood: (food: any) => void;
}

// ─── Component ──────────────────────────────────────────────
export default function FoodSearchSection({ userId, onSelectFood }: FoodSearchSectionProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Debounce search input
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // Use reactive query instead of action — searches local customFoods database
    const searchResults = useQuery(
        api.customFoods.searchLocalFoods,
        debouncedQuery ? { query: debouncedQuery, limit: 50 } : 'skip'
    );
    const loadingSearch = debouncedQuery.length > 0 && searchResults === undefined;

    const handleAdd = useCallback(
        (food: any) => {
            onSelectFood(food);
        },
        [onSelectFood]
    );

    return (
        <>
            <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search foods..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                />
            </View>

            {loadingSearch ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Searching foods...</Text>
                </View>
            ) : (
                <View style={styles.searchResults}>
                    {(searchResults ?? []).map((food) => (
                        <SearchResultItem
                            key={String(food._id)}
                            food={food}
                            onAdd={() => handleAdd(food)}
                        />
                    ))}
                    {!loadingSearch && searchQuery && (searchResults ?? []).length === 0 && (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No foods found for "{searchQuery}"</Text>
                            <Text style={styles.emptySubtext}>Try a different search term</Text>
                        </View>
                    )}
                </View>
            )}
        </>
    );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        position: 'relative',
    },
    searchIcon: {
        position: 'absolute',
        left: 12,
        zIndex: 1,
    },
    searchInput: {
        flex: 1,
        height: 50,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 12,
        paddingHorizontal: 40,
        fontSize: 16,
        backgroundColor: '#ffffff',
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748b',
    },
    emptyContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#64748b',
    },
    emptySubtext: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 4,
    },
    searchResults: {
        gap: 12,
    },
    foodItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        backgroundColor: '#ffffff',
    },
    foodItemContent: {
        flex: 1,
    },
    foodItemName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1e293b',
        marginBottom: 4,
    },
    foodItemBrand: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 4,
    },
    foodItemNutrition: {
        fontSize: 12,
        color: '#64748b',
    },
    foodItemAdd: {
        marginLeft: 12,
    },
    foodItemThumbnail: {
        width: 44,
        height: 44,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: '#f1f5f9',
    },
    foodItemThumbnailPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
});
