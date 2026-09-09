import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Globe, BarChart2, Bookmark, Clock, BookOpen, CheckCircle2 } from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';

export default function MobileDashboardScreen() {
  const { links, domainStats, syncAllFromSupabase } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncAllFromSupabase();
    setRefreshing(false);
  }, [syncAllFromSupabase]);

  const totalCount = links.length;
  const toReadCount = links.filter(l => !l.reading_status || l.reading_status === 'to_read').length;
  const readingCount = links.filter(l => l.reading_status === 'reading').length;
  const doneCount = links.filter(l => l.reading_status === 'done').length;

  const toReadPct = totalCount > 0 ? (toReadCount / totalCount) * 100 : 0;
  const readingPct = totalCount > 0 ? (readingCount / totalCount) * 100 : 0;
  const donePct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <Text style={styles.heading}>Personal Analytics</Text>
      <Text style={styles.subheading}>Reading progression & domain habits across your library</Text>

      {/* Metric Cards 2x2 Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statLabelRow}>
            <Bookmark color="#818cf8" size={13} />
            <Text style={styles.statLabel}>TOTAL LINKS</Text>
          </View>
          <Text style={styles.statNumber}>{totalCount}</Text>
          <Text style={styles.statHint}>Saved in library</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statLabelRow}>
            <Clock color="#f59e0b" size={13} />
            <Text style={styles.statLabel}>TO READ</Text>
          </View>
          <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{toReadCount}</Text>
          <Text style={styles.statHint}>{totalCount > 0 ? Math.round(toReadPct) : 0}% of library</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statLabelRow}>
            <BookOpen color="#818cf8" size={13} />
            <Text style={styles.statLabel}>READING</Text>
          </View>
          <Text style={[styles.statNumber, { color: '#818cf8' }]}>{readingCount}</Text>
          <Text style={styles.statHint}>In progress</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statLabelRow}>
            <CheckCircle2 color="#34d399" size={13} />
            <Text style={styles.statLabel}>COMPLETED</Text>
          </View>
          <Text style={[styles.statNumber, { color: '#34d399' }]}>{doneCount}</Text>
          <Text style={styles.statHint}>{totalCount > 0 ? Math.round(donePct) : 0}% completion</Text>
        </View>
      </View>

      {/* Progress Distribution Bar */}
      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>Reading Status Distribution</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressSegment, { width: `${toReadPct}%`, backgroundColor: '#f59e0b' }]} />
          <View style={[styles.progressSegment, { width: `${readingPct}%`, backgroundColor: '#6366f1' }]} />
          <View style={[styles.progressSegment, { width: `${donePct}%`, backgroundColor: '#10b981' }]} />
        </View>
        <View style={styles.progressLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.legendText}>To Read ({toReadCount})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#6366f1' }]} />
            <Text style={styles.legendText}>Reading ({readingCount})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText}>Done ({doneCount})</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionHeader}>MOST FREQUENT DOMAINS</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={domainStats}
        keyExtractor={item => item.domain}
        ListHeaderComponent={renderHeader}
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
              <Text style={styles.domainName} numberOfLines={1}>{item.domain}</Text>
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
  headerSection: {
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#18181b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statLabel: {
    color: '#a1a1aa',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statNumber: {
    color: '#fafafa',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  statHint: {
    color: '#71717a',
    fontSize: 11,
  },
  progressCard: {
    backgroundColor: '#18181b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 20,
  },
  progressTitle: {
    color: '#fafafa',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#27272a',
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 10,
  },
  progressSegment: {
    height: '100%',
  },
  progressLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    color: '#a1a1aa',
    fontSize: 11,
  },
  sectionHeader: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
});
