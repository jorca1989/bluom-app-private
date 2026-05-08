import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

// ─── Memoized search result row ─────────────────────────────
const SearchResultItem = React.memo(({ food, onAdd }: { food: any; onAdd: () => void }) => (
    <TouchableOpacity style={styles.foodItem} onPress={onAdd}>
        <View style={styles.foodItemContent}>
            <Text style={styles.foodItemName}>
                {typeof food.name === 'object'
                    ? (food.name as any).en || 'Food'
                    : food.name}
            </Text>
            <Text style={styles.foodItemBrand}>{food.brand ?? '—'} • {food.servingSize ?? '100g'}</Text>
            <Text style={styles.foodItemNutrition}>
                {Math.round(food.calories ?? 0)} cal • {Math.round(food.protein ?? 0)}g protein • {Math.round(food.carbs ?? 0)}g carbs • {Math.round(food.fat ?? 0)}g fat
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
    const searchExternalFoods = useAction(api.externalFoods.searchFoods);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loadingSearch, setLoadingSearch] = useState(false);

    // Debounced search
    useEffect(() => {
        let cancelled = false;
        const t = setTimeout(async () => {
            if (!userId) return;
            if (!searchQuery.trim()) {
                if (!cancelled) setSearchResults([]);
                return;
            }
            setLoadingSearch(true);
            try {
                const results = await searchExternalFoods({ userId: userId as any, query: searchQuery, limit: 50 });
                if (!cancelled) setSearchResults(results ?? []);
            } catch {
                if (!cancelled) setSearchResults([]);
            } finally {
                if (!cancelled) setLoadingSearch(false);
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [userId, searchQuery, searchExternalFoods]);

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
                    {searchResults.map((food) => (
                        <SearchResultItem
                            key={food.kind === 'external' ? `${food.source}:${food.externalId}` : String(food._id)}
                            food={food}
                            onAdd={() => handleAdd(food)}
                        />
                    ))}
                    {!loadingSearch && searchQuery && searchResults.length === 0 && (
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
});
