# Phase 7.1.5: Advanced Features

**Duration:** 2 weeks
**Status:** Planned
**Prerequisites:** Phase 7.1.4 Offline & Polish Complete

---

## Overview

Implement AI email summarization, team inbox management, comprehensive settings, OTP auto-copy, and share extension.

---

## Week 10: AI & Teams

### Day 60-62: AI Email Summarization

```typescript
// src/api/ai.ts
import { api } from './client';

export const aiApi = {
  summarize: (messageId: string) =>
    api.request<{ summary: string; creditsUsed: number }>(`/messages/${messageId}/summarize`, {
      method: 'POST',
    }),

  getCredits: () =>
    api.request<{ credits: number; tier: string }>('/user/credits'),
};
```

```typescript
// src/components/AISummaryCard.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { aiApi } from '@/api/ai';
import { useAuthStore } from '@/store/authStore';
import { haptics } from '@/utils/haptics';
import { useTheme } from '@/hooks/useTheme';

interface AISummaryCardProps {
  messageId: string;
  existingSummary?: string;
}

export function AISummaryCard({ messageId, existingSummary }: AISummaryCardProps) {
  const theme = useTheme();
  const [summary, setSummary] = useState(existingSummary);
  const user = useAuthStore((s) => s.user);

  const hasTierAccess = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(user?.tier || '');

  const { data: credits } = useQuery({
    queryKey: ['credits'],
    queryFn: aiApi.getCredits,
    enabled: hasTierAccess,
  });

  const summarizeMutation = useMutation({
    mutationFn: () => aiApi.summarize(messageId),
    onSuccess: (data) => {
      setSummary(data.summary);
      haptics.success();
    },
    onError: () => {
      haptics.error();
    },
  });

  if (!hasTierAccess) {
    return (
      <View style={[styles.upgradeCard, { backgroundColor: theme.surface }]}>
        <Ionicons name="sparkles" size={20} color={theme.primary} />
        <Text style={[styles.upgradeText, { color: theme.textSecondary }]}>
          Nâng cấp lên Starter để sử dụng AI tóm tắt
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={20} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>Tóm tắt AI</Text>
        {credits && (
          <Text style={[styles.credits, { color: theme.textSecondary }]}>
            {credits.credits} credits
          </Text>
        )}
      </View>

      {summary ? (
        <Text style={[styles.summary, { color: theme.text }]}>{summary}</Text>
      ) : (
        <TouchableOpacity
          style={[styles.generateButton, { borderColor: theme.primary }]}
          onPress={() => summarizeMutation.mutate()}
          disabled={summarizeMutation.isPending}
        >
          {summarizeMutation.isPending ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <>
              <Ionicons name="flash" size={16} color={theme.primary} />
              <Text style={[styles.generateText, { color: theme.primary }]}>
                Tạo tóm tắt (1 credit)
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
```

### Tasks
- [ ] Create AI API module
- [ ] Build AISummaryCard component
- [ ] Check tier access before showing
- [ ] Display credit balance
- [ ] Handle loading/error states
- [ ] Add haptic feedback

### Day 63-65: Team Inbox Management

```typescript
// src/api/teams.ts
import { api } from './client';
import type { Team, TeamMember, TeamInbox } from '@/types';

export const teamsApi = {
  list: () =>
    api.request<{ teams: Team[] }>('/teams'),

  get: (id: string) =>
    api.request<{ team: Team }>(`/teams/${id}`),

  create: (name: string) =>
    api.request<{ team: Team }>('/teams', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  getMembers: (teamId: string) =>
    api.request<{ members: TeamMember[] }>(`/teams/${teamId}/members`),

  addMember: (teamId: string, email: string, role: string) =>
    api.request<{ member: TeamMember }>(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  removeMember: (teamId: string, memberId: string) =>
    api.request<{ ok: boolean }>(`/teams/${teamId}/members/${memberId}`, {
      method: 'DELETE',
    }),

  getSharedInboxes: (teamId: string) =>
    api.request<{ inboxes: TeamInbox[] }>(`/teams/${teamId}/inboxes`),

  shareInbox: (teamId: string, inboxId: string) =>
    api.request<{ ok: boolean }>(`/teams/${teamId}/inboxes/${inboxId}`, {
      method: 'POST',
    }),
};
```

```typescript
// app/(tabs)/teams.tsx
import { FlatList, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { teamsApi } from '@/api/teams';
import { TeamCard } from '@/components/TeamCard';
import { router } from 'expo-router';

export default function TeamsScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.list,
  });

  return (
    <FlatList
      data={data?.teams}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TeamCard
          team={item}
          onPress={() => router.push(`/team/${item.id}`)}
        />
      )}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
      ListEmptyComponent={
        !isLoading && <EmptyState message="Chưa có nhóm nào" />
      }
    />
  );
}
```

```typescript
// app/team/[id].tsx
import { useLocalSearchParams } from 'expo-router';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { teamsApi } from '@/api/teams';
import { MemberItem } from '@/components/MemberItem';
import { SharedInboxItem } from '@/components/SharedInboxItem';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: team } = useQuery({
    queryKey: ['team', id],
    queryFn: () => teamsApi.get(id),
  });

  const { data: members } = useQuery({
    queryKey: ['team', id, 'members'],
    queryFn: () => teamsApi.getMembers(id),
  });

  const { data: inboxes } = useQuery({
    queryKey: ['team', id, 'inboxes'],
    queryFn: () => teamsApi.getSharedInboxes(id),
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.teamName}>{team?.team.name}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thành viên ({members?.members.length})</Text>
        {members?.members.map((member) => (
          <MemberItem key={member.id} member={member} />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hộp thư chia sẻ ({inboxes?.inboxes.length})</Text>
        {inboxes?.inboxes.map((inbox) => (
          <SharedInboxItem key={inbox.id} inbox={inbox} />
        ))}
      </View>
    </ScrollView>
  );
}
```

### Tasks
- [ ] Create teams API module
- [ ] Build Teams list screen
- [ ] Build Team detail screen
- [ ] Show team members with roles
- [ ] Show shared inboxes
- [ ] Add member management (add/remove)
- [ ] Add inbox sharing controls

---

## Week 11: Settings & Extensions

### Day 66-68: Comprehensive Settings

```typescript
// app/(tabs)/settings.tsx
import { ScrollView, View, Text, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useNotificationStore } from '@/store/notificationStore';
import { BiometricAuth } from '@/utils/biometrics';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const { mode, setMode } = useThemeStore();
  const { settings, updateSettings } = useNotificationStore();
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tài khoản</Text>
        <View style={styles.card}>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.tier}>{user?.tier} Plan</Text>
        </View>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/settings/subscription')}
        >
          <Ionicons name="diamond" size={20} color="#8B5CF6" />
          <Text style={styles.rowText}>Quản lý gói đăng ký</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Giao diện</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/settings/theme')}
        >
          <Ionicons name="moon" size={20} color="#6B7280" />
          <Text style={styles.rowText}>Chế độ tối</Text>
          <Text style={styles.rowValue}>
            {mode === 'system' ? 'Hệ thống' : mode === 'dark' ? 'Bật' : 'Tắt'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông báo</Text>
        <View style={styles.row}>
          <Ionicons name="notifications" size={20} color="#6B7280" />
          <Text style={styles.rowText}>Thông báo đẩy</Text>
          <Switch
            value={settings.pushEnabled}
            onValueChange={(v) => updateSettings({ pushEnabled: v })}
          />
        </View>
        <View style={styles.row}>
          <Ionicons name="volume-high" size={20} color="#6B7280" />
          <Text style={styles.rowText}>Âm thanh</Text>
          <Switch
            value={settings.soundEnabled}
            onValueChange={(v) => updateSettings({ soundEnabled: v })}
          />
        </View>
      </View>

      {/* Security Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bảo mật</Text>
        <View style={styles.row}>
          <Ionicons name="finger-print" size={20} color="#6B7280" />
          <Text style={styles.rowText}>Mở khóa sinh trắc học</Text>
          <Switch
            value={biometricEnabled}
            onValueChange={async (v) => {
              if (v && await BiometricAuth.isAvailable()) {
                setBiometricEnabled(true);
              } else {
                setBiometricEnabled(false);
              }
            }}
          />
        </View>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/settings/change-password')}
        >
          <Ionicons name="key" size={20} color="#6B7280" />
          <Text style={styles.rowText}>Đổi mật khẩu</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.dangerRow} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#EF4444" />
          <Text style={styles.dangerText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
```

### Tasks
- [ ] Build comprehensive Settings screen
- [ ] Account info display
- [ ] Theme selection (system/light/dark)
- [ ] Notification toggles
- [ ] Biometric toggle
- [ ] Change password screen
- [ ] Subscription management link
- [ ] Logout with confirmation

### Day 69-70: OTP Auto-Copy

```typescript
// src/utils/otpExtractor.ts
const OTP_PATTERNS = [
  /\b(\d{6})\b.*(?:mã|code|otp|xác\s*minh|verification)/i,
  /(?:mã|code|otp|xác\s*minh|verification).*\b(\d{6})\b/i,
  /\b(\d{4,8})\b/,
];

export function extractOTP(text: string): string | null {
  for (const pattern of OTP_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}
```

```typescript
// src/components/OTPBanner.tsx
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '@/utils/haptics';

interface OTPBannerProps {
  otp: string;
  onDismiss: () => void;
}

export function OTPBanner({ otp, onDismiss }: OTPBannerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(otp);
    setCopied(true);
    haptics.success();
    setTimeout(() => onDismiss(), 1500);
  };

  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <Ionicons name="key" size={20} color="#FFF" />
        <Text style={styles.otpText}>{otp}</Text>
      </View>
      <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
        <Ionicons
          name={copied ? 'checkmark' : 'copy'}
          size={20}
          color="#FFF"
        />
        <Text style={styles.copyText}>{copied ? 'Đã sao chép' : 'Sao chép'}</Text>
      </TouchableOpacity>
    </View>
  );
}
```

```typescript
// In MessageDetailScreen - detect OTP and show banner
const otp = useMemo(() => {
  if (message?.textBody) {
    return extractOTP(message.textBody);
  }
  return null;
}, [message?.textBody]);

// In render:
{otp && <OTPBanner otp={otp} onDismiss={() => {}} />}
```

### Tasks
- [ ] Create OTP extraction patterns
- [ ] Build OTPBanner component
- [ ] Auto-detect OTP in messages
- [ ] Copy to clipboard with haptic
- [ ] Show copied confirmation
- [ ] Auto-dismiss after copy

### Day 71-72: Share Extension (iOS)

```typescript
// ios/ShareExtension/ShareViewController.swift
import UIKit
import Social
import MobileCoreServices

class ShareViewController: SLComposeServiceViewController {
  override func isContentValid() -> Bool {
    return true
  }

  override func didSelectPost() {
    guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
          let itemProvider = extensionItem.attachments?.first else {
      return
    }

    if itemProvider.hasItemConformingToTypeIdentifier(kUTTypeURL as String) {
      itemProvider.loadItem(forTypeIdentifier: kUTTypeURL as String, options: nil) { (url, error) in
        if let shareURL = url as? URL {
          self.shareToEphemera(url: shareURL)
        }
      }
    }

    self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
  }

  private func shareToEphemera(url: URL) {
    // Open app with shared URL
    let appURL = URL(string: "ephemera://share?url=\(url.absoluteString)")!
    // Use app groups to share data
  }

  override func configurationItems() -> [Any]! {
    return []
  }
}
```

### Tasks
- [ ] Create iOS Share Extension target
- [ ] Handle shared URLs
- [ ] Handle shared text
- [ ] Open main app with shared content
- [ ] Use App Groups for data sharing

### Day 73: Testing & Integration

### Tasks
- [ ] Test AI summarization with real API
- [ ] Test team management flows
- [ ] Test all settings toggles
- [ ] Test OTP detection accuracy
- [ ] Test share extension
- [ ] Fix any edge cases

---

## Deliverables

| Deliverable | Status |
|-------------|--------|
| AI email summarization | ⬜ |
| Team inbox management | ⬜ |
| Comprehensive settings | ⬜ |
| OTP auto-copy | ⬜ |
| Share extension (iOS) | ⬜ |

---

## Success Criteria

- [ ] AI summary generates correctly for paid tiers
- [ ] Team members can access shared inboxes
- [ ] All settings persist correctly
- [ ] OTP extracted and copied with one tap
- [ ] Share extension sends content to app
- [ ] No crashes or data loss

---

## Files to Create

```
src/
├── api/
│   ├── ai.ts
│   └── teams.ts
├── components/
│   ├── AISummaryCard.tsx
│   ├── TeamCard.tsx
│   ├── MemberItem.tsx
│   ├── SharedInboxItem.tsx
│   └── OTPBanner.tsx
├── utils/
│   └── otpExtractor.ts
app/
├── (tabs)/
│   ├── settings.tsx
│   └── teams.tsx
├── team/[id].tsx
└── settings/
    ├── theme.tsx
    ├── subscription.tsx
    └── change-password.tsx
ios/
└── ShareExtension/
    └── ShareViewController.swift
```

---

## Next Phase

After Advanced Features, proceed to **Phase 7.1.6: Release** (1 week):
- App Store assets
- Play Store listing
- Beta testing
- Production release
