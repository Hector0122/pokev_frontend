import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useCards } from '../hooks/queries/useCards';
import CardTile from '../components/CardTile';
import EmptyState from '../components/EmptyState';
import AppIcon from '../components/AppIcon';
import AddCardFab from '../components/AddCardFab';
import QueryState from '../components/QueryState';
import type { MainTabNavigationProp } from '../navigation/types';

/** "Mi colección" (§5) — exclusivamente las cartas que realmente tenemos. */
export default function CollectionScreen() {
  const { colors, spacing, type, fontFamily } = useTheme();
  const navigation = useNavigation<MainTabNavigationProp<'Coleccion'>>();
  const cardsQuery = useCards();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: spacing.lg,
          paddingBottom: spacing.sm,
        }}
      >
        <Text style={{ ...type.display, fontFamily: fontFamily.display, color: colors.text }}>Mi colección</Text>
        <Pressable onPress={() => navigation.navigate('Special')} hitSlop={12}>
          <AppIcon name="corazon" size={32} />
        </Pressable>
      </View>

      <QueryState isLoading={cardsQuery.isLoading} error={cardsQuery.error} onRetry={() => cardsQuery.refetch()}>
        {cardsQuery.data && cardsQuery.data.length > 0 ? (
          <FlatList
            data={cardsQuery.data}
            keyExtractor={(card) => card.id}
            numColumns={3}
            columnWrapperStyle={{ gap: spacing.sm }}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.huge }}
            renderItem={({ item }) => (
              <CardTile card={item} onPress={() => navigation.navigate('CardDetail', { cardId: item.id })} />
            )}
          />
        ) : (
          <EmptyState
            icon={<AppIcon name="bulbasour" size={72} />}
            title="Todavía no tenemos cartas"
            description="Agreguemos la primera carta de nuestro álbum."
          />
        )}
      </QueryState>
      <AddCardFab />
    </SafeAreaView>
  );
}
