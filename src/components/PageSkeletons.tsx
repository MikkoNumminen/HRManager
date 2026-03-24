"use client";

import { AppBar, Box, Skeleton, Toolbar } from "@mui/material";
import { colors, pageContainerStyles } from "@/muiStyles";

// Reusable top bar placeholder — matches AppBar + Toolbar height
function TopBarSkeleton() {
  return (
    <AppBar position="static" sx={{ backgroundColor: colors.slate800, mb: 2 }}>
      <Toolbar>
        <Skeleton variant="circular" width={36} height={36} sx={{ mr: 1.5 }} />
        <Skeleton variant="text" width={180} height={28} />
        <Box sx={{ flexGrow: 1 }} />
        <Skeleton variant="circular" width={36} height={36} />
      </Toolbar>
    </AppBar>
  );
}

// A single form card placeholder used on detail pages
function FormCardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <Box sx={{ ...pageContainerStyles, mb: 1.5 }}>
      <Skeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={40} sx={{ mb: 1 }} />
      ))}
      <Skeleton variant="rounded" width={100} height={36} />
    </Box>
  );
}

// Table page: persons / teams / departments list
export function TablePageSkeleton() {
  return (
    <>
      <TopBarSkeleton />
      <Box sx={{ ...pageContainerStyles }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
          <Skeleton variant="text" width={120} height={28} />
          <Skeleton variant="rounded" width={100} height={36} />
        </Box>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={48} sx={{ mb: 0.75 }} />
        ))}
      </Box>
    </>
  );
}

// Detail page: person / team / department / user — stacked form cards
export function DetailPageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <>
      <TopBarSkeleton />
      {Array.from({ length: cards }).map((_, i) => (
        <FormCardSkeleton key={i} lines={i === 0 ? 1 : 2} />
      ))}
    </>
  );
}

// Dashboard: KPI cards + charts
export function DashboardSkeleton() {
  return (
    <>
      <TopBarSkeleton />
      {/* KPI cards */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 1.5 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={100}
            sx={{ flex: 1, minWidth: { xs: "calc(50% - 12px)", md: "calc(25% - 12px)" } }}
          />
        ))}
      </Box>
      {/* Charts row */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 1.5 }}>
        <Skeleton
          variant="rounded"
          height={320}
          sx={{ flex: 1, minWidth: { xs: "100%", md: "calc(50% - 12px)" } }}
        />
        <Skeleton
          variant="rounded"
          height={320}
          sx={{ flex: 1, minWidth: { xs: "100%", md: "calc(50% - 12px)" } }}
        />
      </Box>
      {/* Growth timeline */}
      <Skeleton variant="rounded" height={320} sx={{ mb: 1.5 }} />
      {/* Recent activity */}
      <Skeleton variant="rounded" height={200} />
    </>
  );
}

// Profile page
export function ProfileSkeleton() {
  return (
    <>
      <TopBarSkeleton />
      <Box sx={{ ...pageContainerStyles }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Skeleton variant="circular" width={64} height={64} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="50%" height={28} />
            <Skeleton variant="text" width="35%" height={20} />
          </Box>
        </Box>
        <Skeleton variant="rounded" height={40} sx={{ mb: 1.5 }} />
        <Skeleton variant="rounded" height={40} sx={{ mb: 1.5 }} />
        <Skeleton variant="rounded" width={120} height={36} />
      </Box>
    </>
  );
}

// Audit log page: filters + table
export function AuditLogSkeleton() {
  return (
    <>
      <TopBarSkeleton />
      <Box sx={{ ...pageContainerStyles }}>
        <Skeleton variant="text" width={160} height={28} sx={{ mb: 1.5 }} />
        {/* Filter bar */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={40} sx={{ width: 160 }} />
          ))}
        </Box>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={44} sx={{ mb: 0.75 }} />
        ))}
      </Box>
    </>
  );
}

// Data import / export page
export function DataPageSkeleton() {
  return (
    <>
      <TopBarSkeleton />
      <Box sx={{ ...pageContainerStyles, mb: 1.5 }}>
        <Skeleton variant="text" width={180} height={28} sx={{ mb: 1 }} />
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={60}
              sx={{ flex: 1, minWidth: { xs: "100%", sm: 160 } }}
            />
          ))}
        </Box>
      </Box>
      <Box sx={{ ...pageContainerStyles }}>
        <Skeleton variant="text" width={180} height={28} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={100} />
      </Box>
    </>
  );
}

// Admin user list
export function AdminPageSkeleton() {
  return (
    <>
      <TopBarSkeleton />
      <Box sx={{ ...pageContainerStyles }}>
        <Skeleton variant="text" width={160} height={28} sx={{ mb: 1.5 }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={52} sx={{ mb: 0.75 }} />
        ))}
      </Box>
    </>
  );
}
