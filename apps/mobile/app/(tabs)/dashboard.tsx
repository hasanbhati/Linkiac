import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Globe, BarChart2 } from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';

export default function MobileDashboardScreen() {
  const { domainStats, syncAllFromSupabase } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncAllFromSupabase();
    setRefreshing(false);
  }, [syncAllFromSupabase]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Domain Analytics</Text>
      <Text style={styles.subheading}>Your most frequently saved domains</Text>

      <FlatList
        data={domainStats}
        keyExtractor={item => item.domain}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <BarChart2 color="#3f3f46" size={48} />
            <Text style={styles.emptyTitle}>No domain analytics yet</Text>
            <Text style={styles.emptySubtitle}>
              Save web links to see analytics and domain frequency breakdown.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <View style={styles.domainInfo}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <Globe color="#818cf8" size={16} />
              <Text style={styles.domainName}>{item.domain}</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {item.count} {item.count === 1 ? 'link' : 'links'}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    padding: 16,
  },
  heading: {
    color: '#fafafa',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subheading: {
    color: '#a1a1aa',
    fontSize: 13,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#18181b',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  domainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  rank: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '700',
    width: 24,
  },
  domainName: {
    color: '#fafafa',
    fontSize: 14,
    fontWeight: '500',
  },
  countBadge: {
    backgroundColor: '#27272a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countText: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#fafafa',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#71717a',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
