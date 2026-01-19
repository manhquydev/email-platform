# Phase 7.1.2: Core Features

**Duration:** 3 weeks
**Status:** Planned
**Prerequisites:** Phase 7.1.1 Foundation Complete

---

## Overview

Implement core email functionality: inbox list, message list with pagination, message detail view, and attachment handling.

---

## Week 3: Inbox & Message List

### Day 15-16: React Query Setup & Inbox API

```typescript
// src/api/inboxes.ts
import { api } from './client';
import type { Inbox, PaginatedResponse } from '@/types';

export const inboxesApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    api.request<PaginatedResponse<Inbox>>('/inboxes', {
      method: 'GET',
      ...(params && { query: params }),
    }),

  get: (id: string) =>
    api.request<{ inbox: Inbox }>(`/inboxes/${id}`),

  create: (domainId: string, localPart: string) =>
    api.request<{ inbox: Inbox }>('/inboxes', {
      method: 'POST',
      body: JSON.stringify({ domainId, localPart }),
    }),

  delete: (id: string) =>
    api.request<{ ok: boolean }>(`/inboxes/${id}`, { method: 'DELETE' }),
};
```

```typescript
// src/hooks/useInboxes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inboxesApi } from '@/api/inboxes';

export function useInboxes() {
  return useQuery({
    queryKey: ['inboxes'],
    queryFn: () => inboxesApi.list({ limit: 50 }),
  });
}

export function useCreateInbox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ domainId, localPart }: { domainId: string; localPart: string }) =>
      inboxesApi.create(domainId, localPart),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inboxes'] }),
  });
}
```

### Tasks
- [ ] Configure React Query provider
- [ ] Create `inboxesApi` with CRUD operations
- [ ] Create `useInboxes` hook
- [ ] Create `useCreateInbox` mutation
- [ ] Add query invalidation on mutations

### Day 17-18: Inbox List Screen

```typescript
// app/(tabs)/inboxes.tsx
import { FlatList, RefreshControl } from 'react-native';
import { useInboxes } from '@/hooks/useInboxes';
import { InboxCard } from '@/components/InboxCard';
import { EmptyState } from '@/components/EmptyState';
import { router } from 'expo-router';

export default function InboxesScreen() {
  const { data, isLoading, refetch, isRefetching } = useInboxes();

  const handleInboxPress = (id: string) => {
    router.push(`/inbox/${id}`);
  };

  if (!data?.data.length && !isLoading) {
    return <EmptyState message="Chưa có hộp thư nào" />;
  }

  return (
    <FlatList
      data={data?.data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <InboxCard
          inbox={item}
          onPress={() => handleInboxPress(item.id)}
        />
      )}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
      contentContainerStyle={styles.list}
    />
  );
}
```

```typescript
// src/components/InboxCard.tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Inbox } from '@/types';

interface InboxCardProps {
  inbox: Inbox;
  onPress: () => void;
}

export function InboxCard({ inbox, onPress }: InboxCardProps) {
  const email = `${inbox.localPart}@${inbox.domain?.name}`;
  const messageCount = inbox._count?.messages ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Ionicons name="mail" size={24} color="#8B5CF6" />
      </View>
      <View style={styles.content}>
        <Text style={styles.email} numberOfLines={1}>{email}</Text>
        <Text style={styles.meta}>
          {messageCount} tin nhắn
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}
```

### Tasks
- [ ] Create `InboxCard` component
- [ ] Create `EmptyState` component
- [ ] Implement inbox list with `FlatList`
- [ ] Add pull-to-refresh
- [ ] Navigate to inbox detail on press

### Day 19-21: Message List Screen

```typescript
// src/api/messages.ts
import { api } from './client';
import type { Message, PaginatedResponse } from '@/types';

export const messagesApi = {
  list: (inboxId: string, params?: { limit?: number; offset?: number }) =>
    api.request<PaginatedResponse<Message>>(`/inboxes/${inboxId}/messages`, {
      method: 'GET',
      ...(params && { query: params }),
    }),

  get: (id: string) =>
    api.request<{ message: Message }>(`/messages/${id}`),

  markRead: (id: string, isRead: boolean) =>
    api.request<{ message: Message }>(`/messages/${id}/read`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead }),
    }),

  delete: (id: string) =>
    api.request<{ ok: boolean }>(`/messages/${id}`, { method: 'DELETE' }),
};
```

```typescript
// app/inbox/[id].tsx
import { useLocalSearchParams } from 'expo-router';
import { FlatList, RefreshControl } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { messagesApi } from '@/api/messages';
import { MessageItem } from '@/components/MessageItem';

const PAGE_SIZE = 20;

export default function InboxDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['messages', id],
    queryFn: ({ pageParam = 0 }) =>
      messagesApi.list(id, { limit: PAGE_SIZE, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.flatMap((p) => p.data).length;
      return totalFetched < (lastPage.meta?.total ?? 0)
        ? totalFetched
        : undefined;
    },
    initialPageParam: 0,
  });

  const messages = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MessageItem message={item} />}
      onEndReached={() => hasNextPage && fetchNextPage()}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
      ListFooterComponent={isFetchingNextPage ? <LoadingSpinner /> : null}
    />
  );
}
```

```typescript
// src/components/MessageItem.tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { formatRelativeTime } from '@/utils/format';
import type { Message } from '@/types';

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const handlePress = () => {
    router.push(`/message/${message.id}`);
  };

  return (
    <TouchableOpacity
      style={[styles.container, !message.isRead && styles.unread]}
      onPress={handlePress}
    >
      <View style={styles.header}>
        <Text style={styles.from} numberOfLines={1}>
          {message.fromAddress || 'Unknown'}
        </Text>
        <Text style={styles.time}>
          {formatRelativeTime(message.receivedAt)}
        </Text>
      </View>
      <Text style={styles.subject} numberOfLines={1}>
        {message.subject || '(Không có tiêu đề)'}
      </Text>
      <Text style={styles.preview} numberOfLines={2}>
        {message.textBody?.substring(0, 100) || ''}
      </Text>
      {message.attachments?.length > 0 && (
        <View style={styles.attachmentBadge}>
          <Ionicons name="attach" size={14} color="#6B7280" />
          <Text style={styles.attachmentCount}>
            {message.attachments.length}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
```

### Tasks
- [ ] Create `messagesApi` with pagination
- [ ] Implement infinite scroll with `useInfiniteQuery`
- [ ] Create `MessageItem` component
- [ ] Show unread indicator (bold/dot)
- [ ] Show attachment badge
- [ ] Add pull-to-refresh

---

## Week 4: Message Detail

### Day 22-24: Message Detail Screen

```typescript
// app/message/[id].tsx
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View, Text } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import RenderHtml from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import { messagesApi } from '@/api/messages';
import { MessageHeader } from '@/components/MessageHeader';
import { AttachmentList } from '@/components/AttachmentList';
import { AISummaryCard } from '@/components/AISummaryCard';

export default function MessageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['message', id],
    queryFn: () => messagesApi.get(id),
  });

  // Auto-mark as read
  const markReadMutation = useMutation({
    mutationFn: () => messagesApi.markRead(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  useEffect(() => {
    if (data?.message && !data.message.isRead) {
      markReadMutation.mutate();
    }
  }, [data?.message?.id]);

  if (isLoading) return <LoadingSpinner />;

  const message = data?.message;
  if (!message) return <ErrorState message="Không tìm thấy email" />;

  return (
    <ScrollView style={styles.container}>
      <MessageHeader message={message} />

      <AISummaryCard messageId={message.id} />

      <View style={styles.body}>
        {message.htmlBody ? (
          <RenderHtml
            contentWidth={width - 32}
            source={{ html: message.htmlBody }}
            tagsStyles={htmlStyles}
          />
        ) : (
          <Text style={styles.textBody}>{message.textBody}</Text>
        )}
      </View>

      {message.attachments?.length > 0 && (
        <AttachmentList attachments={message.attachments} />
      )}
    </ScrollView>
  );
}
```

```typescript
// src/components/MessageHeader.tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDateTime } from '@/utils/format';
import type { Message } from '@/types';

interface MessageHeaderProps {
  message: Message;
}

export function MessageHeader({ message }: MessageHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.subject}>
        {message.subject || '(Không có tiêu đề)'}
      </Text>

      <View style={styles.meta}>
        <View style={styles.row}>
          <Text style={styles.label}>Từ:</Text>
          <Text style={styles.value}>{message.fromAddress}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Đến:</Text>
          <Text style={styles.value}>{message.toAddress}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Ngày:</Text>
          <Text style={styles.value}>
            {formatDateTime(message.receivedAt)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="arrow-undo" size={20} color="#6B7280" />
          <Text style={styles.actionText}>Trả lời</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="arrow-redo" size={20} color="#6B7280" />
          <Text style={styles.actionText}>Chuyển tiếp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="trash" size={20} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

### Tasks
- [ ] Create message detail screen
- [ ] Implement HTML email rendering with `react-native-render-html`
- [ ] Create `MessageHeader` component
- [ ] Auto-mark messages as read
- [ ] Add reply/forward/delete action buttons
- [ ] Style HTML content properly

### Day 25-26: AI Summary Integration

```typescript
// src/components/AISummaryCard.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

interface AISummaryCardProps {
  messageId: string;
}

export function AISummaryCard({ messageId }: AISummaryCardProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

  const hasTierAccess = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(
    user?.tier || ''
  );

  const summarizeMutation = useMutation({
    mutationFn: () =>
      api.request<{ summary: string }>(`/messages/${messageId}/summarize`, {
        method: 'POST',
      }),
    onSuccess: (data) => setSummary(data.summary),
  });

  if (!hasTierAccess) {
    return (
      <View style={styles.upgradeCard}>
        <Ionicons name="sparkles" size={20} color="#8B5CF6" />
        <Text style={styles.upgradeText}>
          Nâng cấp lên Starter để sử dụng AI tóm tắt
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={20} color="#8B5CF6" />
        <Text style={styles.title}>Tóm tắt AI</Text>
      </View>

      {summary ? (
        <Text style={styles.summary}>{summary}</Text>
      ) : (
        <TouchableOpacity
          style={styles.generateButton}
          onPress={() => summarizeMutation.mutate()}
          disabled={summarizeMutation.isPending}
        >
          {summarizeMutation.isPending ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <>
              <Ionicons name="flash" size={16} color="#8B5CF6" />
              <Text style={styles.generateText}>Tạo tóm tắt (1 credit)</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
```

### Tasks
- [ ] Create `AISummaryCard` component
- [ ] Check tier access before showing
- [ ] Call `/messages/:id/summarize` API
- [ ] Show loading state during generation
- [ ] Display summary result

---

## Week 5: Attachments & Search

### Day 27-28: Attachment Handling

```typescript
// src/components/AttachmentList.tsx
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from '@/api/client';
import { formatFileSize } from '@/utils/format';
import type { Attachment } from '@/types';

interface AttachmentListProps {
  attachments: Attachment[];
}

export function AttachmentList({ attachments }: AttachmentListProps) {
  const handleDownload = async (attachment: Attachment) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const uri = `${API_BASE}/attachments/${attachment.id}/download`;

      const downloadPath = `${FileSystem.cacheDirectory}${attachment.filename}`;

      const result = await FileSystem.downloadAsync(uri, downloadPath, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri);
      } else {
        Alert.alert('Đã tải xuống', `Tệp đã lưu tại: ${result.uri}`);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải tệp đính kèm');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Tệp đính kèm ({attachments.length})
      </Text>
      {attachments.map((attachment) => (
        <TouchableOpacity
          key={attachment.id}
          style={styles.item}
          onPress={() => handleDownload(attachment)}
        >
          <Ionicons name="document" size={24} color="#6B7280" />
          <View style={styles.info}>
            <Text style={styles.filename} numberOfLines={1}>
              {attachment.filename}
            </Text>
            <Text style={styles.size}>
              {formatFileSize(attachment.size || 0)}
            </Text>
          </View>
          <Ionicons name="download" size={20} color="#8B5CF6" />
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

### Tasks
- [ ] Create `AttachmentList` component
- [ ] Download attachments with auth header
- [ ] Save to device cache
- [ ] Share via system share sheet
- [ ] Show download progress
- [ ] Handle download errors

### Day 29-31: Search Functionality

```typescript
// src/components/SearchBar.tsx
import { useState, useCallback } from 'react';
import { View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import debounce from 'lodash.debounce';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const debouncedSearch = useCallback(
    debounce((q: string) => onSearch(q), 300),
    [onSearch]
  );

  const handleChange = (text: string) => {
    setQuery(text);
    debouncedSearch(text);
  };

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color="#9CA3AF" />
      <TextInput
        style={styles.input}
        placeholder="Tìm kiếm email..."
        value={query}
        onChangeText={handleChange}
        returnKeyType="search"
      />
      {query.length > 0 && (
        <TouchableOpacity onPress={() => handleChange('')}>
          <Ionicons name="close-circle" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    </View>
  );
}
```

```typescript
// src/hooks/useSearchMessages.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Message, PaginatedResponse } from '@/types';

export function useSearchMessages(query: string) {
  return useQuery({
    queryKey: ['messages', 'search', query],
    queryFn: () =>
      api.request<PaginatedResponse<Message>>(
        `/messages/search?q=${encodeURIComponent(query)}`
      ),
    enabled: query.length >= 2,
  });
}
```

### Tasks
- [ ] Create `SearchBar` component with debounce
- [ ] Create `useSearchMessages` hook
- [ ] Create search results screen
- [ ] Highlight search terms in results
- [ ] Add recent searches

---

## Deliverables

| Deliverable | Status |
|-------------|--------|
| Inbox list with pull-to-refresh | ⬜ |
| Message list with infinite scroll | ⬜ |
| Message detail with HTML rendering | ⬜ |
| AI summary integration | ⬜ |
| Attachment download & share | ⬜ |
| Search functionality | ⬜ |

---

## Success Criteria

- [ ] User can view all inboxes
- [ ] User can view messages in an inbox
- [ ] Messages load with infinite scroll pagination
- [ ] User can read email content (HTML & plain text)
- [ ] User can download attachments
- [ ] User can search across messages
- [ ] AI summary works for paid tiers
- [ ] All screens have loading/error states

---

## Files to Create

```
src/
├── api/
│   ├── inboxes.ts
│   └── messages.ts
├── components/
│   ├── InboxCard.tsx
│   ├── MessageItem.tsx
│   ├── MessageHeader.tsx
│   ├── AttachmentList.tsx
│   ├── AISummaryCard.tsx
│   ├── SearchBar.tsx
│   ├── EmptyState.tsx
│   └── LoadingSpinner.tsx
├── hooks/
│   ├── useInboxes.ts
│   ├── useMessages.ts
│   └── useSearchMessages.ts
└── utils/
    └── format.ts
app/
├── inbox/[id].tsx
└── message/[id].tsx
```

---

## Next Phase

After Core Features, proceed to **Phase 7.1.3: Real-time & Notifications** (2 weeks):
- Push notification setup (FCM/APNs)
- SSE connection for real-time updates
- Background fetch
- Notification badges
