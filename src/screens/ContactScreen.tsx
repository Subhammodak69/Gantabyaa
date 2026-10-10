import React from 'react';
import {Linking, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import CONTACTS from '../config/contacts.json';
import {AppColors, useColors} from '../theme/theme';

const openWhatsApp = (number: string) => Linking.openURL(`https://wa.me/${number.replace(/\D/g, '')}`);

export const ContactScreen: React.FC<{onBack: () => void}> = ({onBack}) => {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton} onPress={onBack}>
          <Feather name="arrow-left" size={21} color={colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Contact us</Text>
          <Text style={styles.headerSubtitle}>We are here to help plan your journey</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Feather name="headphones" size={28} color={colors.gold} />
          <Text style={styles.heroTitle}>Talk to Gantabyaa</Text>
          <Text style={styles.heroText}>Reach our travel team by phone, email, or WhatsApp. Choose any contact below.</Text>
        </View>

        <Text style={styles.sectionTitle}>Call us</Text>
        {CONTACTS.phones.map(contact => (
          <Pressable key={contact.number} style={styles.contactCard} onPress={() => Linking.openURL(`tel:${contact.number}`)}>
            <View style={[styles.icon, {backgroundColor: colors.primarySubtle}]}><Feather name="phone" size={19} color={colors.primary} /></View>
            <View style={styles.copy}><Text style={styles.label}>{contact.label || 'Phone'}</Text><Text style={styles.value}>{contact.display || contact.number}</Text></View>
            <Feather name="external-link" size={16} color={colors.textMuted} />
          </Pressable>
        ))}

        <Text style={styles.sectionTitle}>WhatsApp</Text>
        {CONTACTS.whatsapp.map(contact => (
          <Pressable key={contact.number} style={styles.contactCard} onPress={() => openWhatsApp(contact.number)}>
            <View style={[styles.icon, {backgroundColor: `${colors.whatsapp}22`}]}><Feather name="message-circle" size={19} color={colors.whatsappDark} /></View>
            <View style={styles.copy}><Text style={styles.label}>{contact.label || 'WhatsApp'}</Text><Text style={styles.value}>{contact.display || contact.number}</Text></View>
            <Feather name="external-link" size={16} color={colors.textMuted} />
          </Pressable>
        ))}

        <Text style={styles.sectionTitle}>Email</Text>
        {CONTACTS.emails.map(contact => (
          <Pressable key={contact.address} style={styles.contactCard} onPress={() => Linking.openURL(`mailto:${contact.address}`)}>
            <View style={[styles.icon, {backgroundColor: colors.goldLight}]}><Feather name="mail" size={19} color={colors.goldDark} /></View>
            <View style={styles.copy}><Text style={styles.label}>{contact.label || 'Email'}</Text><Text style={styles.value}>{contact.address}</Text></View>
            <Feather name="external-link" size={16} color={colors.textMuted} />
          </Pressable>
        ))}

        <View style={styles.officeCard}>
          <View style={styles.officeHeading}><Feather name="map-pin" size={18} color={colors.primary} /><Text style={styles.officeTitle}>{CONTACTS.office.name}</Text></View>
          <Text style={styles.officeText}>{CONTACTS.office.address}</Text>
          <Text style={styles.officeText}>{CONTACTS.office.hours}</Text>
          <Text style={styles.officeMuted}>{CONTACTS.office.sundayHours}</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: AppColors) => StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.bg},
  header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg},
  backButton: {width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, marginRight: 12},
  headerCopy: {flex: 1},
  headerTitle: {fontSize: 18, fontWeight: '900', color: colors.text},
  headerSubtitle: {fontSize: 11, color: colors.textSecondary, marginTop: 2},
  content: {padding: 16, paddingBottom: 35},
  hero: {backgroundColor: colors.primaryDark, borderRadius: 16, padding: 20, marginBottom: 22},
  heroTitle: {fontSize: 20, fontWeight: '900', color: colors.textLight, marginTop: 10},
  heroText: {fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 5},
  sectionTitle: {fontSize: 11, fontWeight: '900', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 8},
  contactCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 12, marginBottom: 9},
  icon: {width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 11},
  copy: {flex: 1},
  label: {fontSize: 11, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: .6},
  value: {fontSize: 14, color: colors.text, fontWeight: '800', marginTop: 3},
  officeCard: {backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 15, marginTop: 18},
  officeHeading: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8},
  officeTitle: {fontSize: 14, fontWeight: '900', color: colors.text},
  officeText: {fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 3},
  officeMuted: {fontSize: 11, color: colors.textMuted, marginTop: 3},
});
