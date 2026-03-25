"use client";

import { useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { pageContainerStyles, colors } from "@/muiStyles";
import { useTranslations } from "next-intl";
import type { LeaveType, LeaveRequest, LeaveBalance, Person, Permissions } from "@/schemas";
import LeaveRequestsTab from "./LeaveRequestsTab";
import LeaveTypesTab from "./LeaveTypesTab";
import LeaveBalancesTab from "./LeaveBalancesTab";

interface LeaveManagerProps {
  leaveTypes: LeaveType[];
  leaveRequests: LeaveRequest[];
  leaveBalances: LeaveBalance[];
  persons: Person[];
  permissions: Permissions;
}

function TabPanel({
  children,
  value,
  index,
}: {
  children: React.ReactNode;
  value: number;
  index: number;
}) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

export default function LeaveManager({
  leaveTypes,
  leaveRequests,
  leaveBalances,
  persons,
  permissions,
}: LeaveManagerProps) {
  const t = useTranslations("leave");
  const [tabIndex, setTabIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const canRequest = permissions["leave:request"];
  const canApprove = permissions["leave:approve"];
  const canManageTypes = permissions["leave:manage_types"];

  const filteredRequests =
    statusFilter === "all"
      ? leaveRequests
      : leaveRequests.filter((r) => r.status.toLowerCase() === statusFilter);

  return (
    <Box sx={pageContainerStyles}>
      <Tabs
        value={tabIndex}
        onChange={(_, v) => setTabIndex(v)}
        sx={{ borderBottom: 1, borderColor: colors.slate300 }}
      >
        <Tab label={t("tabRequests")} sx={{ color: colors.slate300 }} />
        <Tab label={t("tabTypes")} sx={{ color: colors.slate300 }} />
        <Tab label={t("tabBalances")} sx={{ color: colors.slate300 }} />
      </Tabs>

      <TabPanel value={tabIndex} index={0}>
        <LeaveRequestsTab
          requests={filteredRequests}
          leaveTypes={leaveTypes}
          persons={persons}
          canRequest={canRequest}
          canApprove={canApprove}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
        />
      </TabPanel>

      <TabPanel value={tabIndex} index={1}>
        <LeaveTypesTab leaveTypes={leaveTypes} canManageTypes={canManageTypes} />
      </TabPanel>

      <TabPanel value={tabIndex} index={2}>
        <LeaveBalancesTab
          balances={leaveBalances}
          leaveTypes={leaveTypes}
          persons={persons}
          canManageTypes={canManageTypes}
        />
      </TabPanel>
    </Box>
  );
}
