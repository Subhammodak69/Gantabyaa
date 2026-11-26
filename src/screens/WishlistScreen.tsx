import React from 'react';
import {RefreshControl, StyleSheet, Text, View} from 'react-native';
import {ScrollView} from '../components/ScrollView';
import {TourCard} from '../components/TourCard';
import {AppColors, useColors} from '../theme/theme';
import {TourPackageSummary} from '../types';

interface Props {tours: TourPackageSummary[]; savedTours: string[]; onSelectTour: (tour: TourPackageSummary) => void; onToggleSave: (slug: string) => void; onRefresh?: () => Promise<void> | void;}
export const WishlistScreen: React.FC<Props> = ({tours, savedTours, onSelectTour, onToggleSave, onRefresh}) => {
  const COLORS = useColors();
  const styles = makeStyles(COLORS);
  const saved = tours.filter(tour => savedTours.includes(tour.slug));
  const [refreshing, setRefreshing] = React.useState(false);
  const handleRefresh = async () => { setRefreshing(true); try { await onRefresh?.(); } finally { setRefreshing(false); } };
  return <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}>
    <Text style={styles.title}>My wishlist</Text><Text style={styles.subtitle}>Packages you are keeping close for later.</Text>
    {saved.length === 0 ? <View style={styles.empty}><Text style={styles.emptyIcon}>♡</Text><Text style={styles.emptyTitle}>Your wishlist is empty</Text><Text style={styles.emptyText}>Tap the heart on any package to save it here.</Text></View> : saved.map(tour => <TourCard key={tour.id} tour={tour} onPress={() => onSelectTour(tour)} isSaved onToggleSave={() => onToggleSave(tour.slug)} />)}
  </ScrollView>;
};
const makeStyles = (COLORS: AppColors) => StyleSheet.create({container:{flex:1,backgroundColor:COLORS.bg},content:{padding:16,paddingBottom:35},title:{fontSize:23,fontWeight:'900',color:COLORS.text},subtitle:{fontSize:12,color:COLORS.textSecondary,marginTop:4,marginBottom:16},empty:{alignItems:'center',paddingVertical:70},emptyIcon:{fontSize:58,color:COLORS.gold},emptyTitle:{fontSize:16,fontWeight:'900',color:COLORS.text,marginTop:10},emptyText:{fontSize:12,color:COLORS.textSecondary,marginTop:5}});

