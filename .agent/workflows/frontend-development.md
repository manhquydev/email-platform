# Frontend Feature Development Workflow

## When to Use
- Creating new React components
- Adding new pages/routes
- Integrating with API endpoints
- UI/UX improvements

## Project Structure

```
services/web/src/
├── components/          # Reusable components
│   ├── ui/             # Base UI (buttons, inputs)
│   └── features/       # Feature-specific
├── pages/              # Route pages
├── hooks/              # Custom React hooks
├── api/                # API client functions
├── utils/              # Utilities
├── types/              # TypeScript types
└── styles/             # Global styles
```

## Step-by-Step Process

### 1. Define Types
```typescript
// services/web/src/types/feature.ts
export interface Feature {
  id: string;
  userId: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface CreateFeatureRequest {
  data: Record<string, unknown>;
}
```

### 2. Create API Client
```typescript
// services/web/src/api/features.ts
import { api } from "./client";
import type { Feature, CreateFeatureRequest } from "../types/feature";

export const featuresApi = {
  list: () => api.get<{ features: Feature[] }>("/features"),
  create: (req: CreateFeatureRequest) => api.post<{ feature: Feature }>("/features", req),
  delete: (id: string) => api.delete(`/features/${id}`),
};
```

### 3. Create Hook
```typescript
// services/web/src/hooks/useFeatures.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { featuresApi } from "../api/features";

export function useFeatures() {
  return useQuery({
    queryKey: ["features"],
    queryFn: () => featuresApi.list(),
  });
}

export function useCreateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: featuresApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features"] });
    },
  });
}
```

### 4. Build Component
```tsx
// services/web/src/components/features/FeatureList.tsx
import { useFeatures } from "../../hooks/useFeatures";
import { Card } from "../ui/Card";
import { Spinner } from "../ui/Spinner";

export function FeatureList() {
  const { data, isLoading, error } = useFeatures();

  if (isLoading) return <Spinner />;
  if (error) return <div className="text-red-500">Failed to load</div>;

  return (
    <div className="space-y-4">
      {data?.features.map((feature) => (
        <Card key={feature.id}>
          <pre>{JSON.stringify(feature.data, null, 2)}</pre>
        </Card>
      ))}
    </div>
  );
}
```

### 5. Add Page Route
```tsx
// services/web/src/pages/FeaturesPage.tsx
import { FeatureList } from "../components/features/FeatureList";
import { CreateFeatureForm } from "../components/features/CreateFeatureForm";

export default function FeaturesPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Features</h1>
      <CreateFeatureForm />
      <FeatureList />
    </div>
  );
}

// Add to router in App.tsx
<Route path="/features" element={<FeaturesPage />} />
```

## TailwindCSS Patterns

### Glassmorphism (project style)
```tsx
<div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
  {children}
</div>
```

### Responsive Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### Form States
```tsx
<button
  disabled={isLoading}
  className={cn(
    "px-4 py-2 rounded-lg transition-colors",
    isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
  )}
>
  {isLoading ? "Saving..." : "Save"}
</button>
```

## Checklist
- [ ] Types defined
- [ ] API client created
- [ ] React Query hooks implemented
- [ ] Components built with loading/error states
- [ ] Routes registered
- [ ] Responsive design verified
- [ ] Accessibility (a11y) considered
- [ ] Error boundaries in place
