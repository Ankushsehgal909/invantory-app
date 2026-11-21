import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Switch, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, User, Bell, Palette, Shield, LogOut, Info, Moon, Sun, Language, Key, Download, Upload, Trash2, ChevronRight, FileText, Edit, MapPin, Phone, Mail } from 'lucide-react-native';
import { apiHelpers } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrencyMajor as formatCurrency } from '@shopstock/shared/utils';

export function SettingsScreen({ navigation }: any) {
  const { user, shop, logout } = useAuth();
  const queryClient = useQueryClient();
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [loading, setLoading] = useState(false);

  const { data: settingsResponse, refetch: refetchSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiHelpers.getSettings(),
    select: (response) => response.data.data.settings,
  });

  const settings = settingsResponse || {};

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        setLoading(true);
        try {
          await logout();
        } finally {
          setLoading(false);
        }
      }},
    ]);
  };

  const handleClearData = async () => {
    Alert.alert(
      'Clear Local Data',
      'This will clear all cached data. You will need to sync again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => {
          // TODO: Clear AsyncStorage
          Alert.alert('Success', 'Local data cleared');
        }},
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your preferences</Text>
        </View>

        {/* User Profile */}
        <View style={styles.section}>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <User size={32} color="#fff" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{user?.phone || user?.email || 'Phone not set'}</Text>
              <View style={styles.profileRole}>
                <Text style={[styles.roleBadge, { backgroundColor: getRoleColor(user?.role) + '20' }]}>
                  <Text style={[styles.roleText, { color: getRoleColor(user?.role) }]}>
                    {user?.role || 'Staff'}
                  </Text>
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#94a3b8" />
          </View>
        </View>

        {/* Shop Info */}
        {shop && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shop Information</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <SettingsIcon size={20} color="#0ea5e9" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Shop Name</Text>
                  <Text style={styles.infoValue}>{shop.name}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Mail size={20} color="#22c55e" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{shop.email || 'Not set'}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Phone size={20} color="#f59e0b" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{shop.phone || 'Not set'}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <MapPin size={20} color="#a855f7" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{shop.address || 'Not set'}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Key size={20} color="#ec4899" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>GSTIN</Text>
                  <Text style={styles.infoValue}>{shop.gstin || 'Not set'}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#a855f720' }]}>
                  <Palette size={20} color="#a855f7" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Dark Mode</Text>
                  <Text style={styles.settingDescription}>Use dark theme</Text>
                </View>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#e2e8f0', true: '#a855f7' }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#0ea5e920' }]}>
                  <Language size={20} color="#0ea5e9" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Language</Text>
                  <Text style={styles.settingDescription}>English</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#f59e0b20' }]}>
                  <Moon size={20} color="#f59e0b" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Currency</Text>
                  <Text style={styles.settingDescription}>INR (₹)</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#ef444420' }]}>
                  <Bell size={20} color="#ef4444" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <Text style={styles.settingDescription}>Receive alerts and updates</Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#e2e8f0', true: '#ef4444' }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#22c55e20' }]}>
                  <Bell size={20} color="#22c55e" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Low Stock Alerts</Text>
                  <Text style={styles.settingDescription}>Notify when stock is low</Text>
                </View>
              </View>
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: '#e2e8f0', true: '#22c55e' }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#f9731620' }]}>
                  <Bell size={20} color="#f97316" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Expiry Alerts</Text>
                  <Text style={styles.settingDescription}>Notify before products expire</Text>
                </View>
              </View>
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: '#e2e8f0', true: '#f97316' }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#ec489920' }]}>
                  <Bell size={20} color="#ec4899" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Payment Reminders</Text>
                  <Text style={styles.settingDescription}>Overdue payment notifications</Text>
                </View>
              </View>
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: '#e2e8f0', true: '#ec4899' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Sync & Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync & Data</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#3b82f620' }]}>
                  <Upload size={20} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Auto Sync</Text>
                  <Text style={styles.settingDescription}>Automatically sync data</Text>
                </View>
              </View>
              <Switch
                value={autoSync}
                onValueChange={setAutoSync}
                trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow} onPress={() => {
              // TODO: Trigger manual sync
              Alert.alert('Sync', 'Syncing data...');
            }}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#6366f120' }]}>
                  <Download size={20} color="#6366f1" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Sync Now</Text>
                  <Text style={styles.settingDescription}>Manually sync all data</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow} onPress={handleClearData}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#ef444420' }]}>
                  <Trash2 size={20} color="#ef4444" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Clear Local Data</Text>
                  <Text style={styles.settingDescription}>Remove cached data from device</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingRow} onPress={() => {
              // TODO: Navigate to change password
            }}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#f59e0b20' }]}>
                  <Key size={20} color="#f59e0b" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Change Password</Text>
                  <Text style={styles.settingDescription}>Update your password</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow} onPress={() => {
              // TODO: Navigate to biometric settings
            }}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#a855f720' }]}>
                  <Shield size={20} color="#a855f7" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Biometric Lock</Text>
                  <Text style={styles.settingDescription}>Use fingerprint/face ID</Text>
                </View>
              </View>
              <Switch
                value={false}
                onValueChange={() => {}}
                trackColor={{ false: '#e2e8f0', true: '#a855f7' }}
                thumbColor="#fff"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Invoice Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Settings</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingRow} onPress={() => {
              // TODO: Navigate to invoice preview
            }}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#0ea5e920' }]}>
                  <FileText size={20} color="#0ea5e9" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Invoice Preview</Text>
                  <Text style={styles.settingDescription}>Preview invoice template</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow} onPress={() => {
              // TODO: Navigate to invoice customization
            }}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#22c55e20' }]}>
                  <Edit size={20} color="#22c55e" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Customize Invoice</Text>
                  <Text style={styles.settingDescription}>Logo, terms, footer, etc.</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#64748b20' }]}>
                  <Info size={20} color="#64748b" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Version</Text>
                  <Text style={styles.settingDescription}>1.0.0</Text>
                </View>
              </View>
            </View>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow} onPress={() => {
              // TODO: Open privacy policy
            }}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#64748b20' }]}>
                  <Shield size={20} color="#64748b" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Privacy Policy</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow} onPress={() => {
              // TODO: Open terms of service
            }}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#64748b20' }]}>
                  <FileText size={20} color="#64748b" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Terms of Service</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingRowDanger} onPress={handleLogout}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#ef444420' }]}>
                  <LogOut size={20} color="#ef4444" />
                </View>
                <View>
                  <Text style={styles.settingLabelDanger}>Logout</Text>
                  <Text style={styles.settingDescription}>Sign out of your account</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>ShopStock v1.0.0</Text>
          <Text style={styles.footerText}>Built with React Native & Expo</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getRoleColor(role: string) {
  switch (role) {
    case 'owner': return '#f59e0b';
    case 'manager': return '#3b82f6';
    case 'staff': return '#22c55e';
    default: return '#64748b';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollView: { flex: 1 },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', gap: 16 },
  profileAvatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '600', color: '#1e293b' },
  profileEmail: { fontSize: 14, color: '#64748b', marginTop: 2 },
  profileRole: { marginTop: 8 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  roleText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  infoCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  infoIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#64748b', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '500', color: '#1e293b' },
  settingsCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'space-between' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 16, fontWeight: '500', color: '#1e293b' },
  settingDescription: { fontSize: 13, color: '#64748b', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 16 },
  settingRowDanger: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  settingLabelDanger: { fontSize: 16, fontWeight: '500', color: '#ef4444' },
  footer: { padding: 20, alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12, color: '#94a3b8' },
});