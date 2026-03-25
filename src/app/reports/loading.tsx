"use client";

import { AppBar, Box, Skeleton, Tab, Tabs, Toolbar } from "@mui/material";
import { colors, pageContainerStyles } from "@/muiStyles";

export default function ReportsLoading() {
  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: colors.slate700, mb: 2 }}>
        <Toolbar>
          <Skeleton variant="circular" width={36} height={36} sx={{ mr: 1.5 }} />
          <Skeleton variant="text" width={180} height={28} />
          <Box sx={{ flexGrow: 1 }} />
          <Skeleton variant="circular" width={36} height={36} />
        </Toolbar>
      </AppBar>
      <Box sx={pageContainerStyles}>
        <Tabs value={0} sx={{ mb: 2 }}>
          <Tab label={<Skeleton width={80} />} />
          <Tab label={<Skeleton width={80} />} />
          <Tab label={<Skeleton width={80} />} />
          <Tab label={<Skeleton width={80} />} />
        </Tabs>
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <Skeleton variant="rounded" width={200} height={40} />
          <Skeleton variant="rounded" width={150} height={40} />
        </Box>
        <Skeleton variant="rounded" height={300} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={200} />
      </Box>
    </>
  );
}
