"use client";

import { useState, useTransition, useActionState } from "react";
import {
  Box,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Button,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  pageContainerStyles,
  tableStyles,
  textFieldStyles,
  formStyles,
  smallButtonStyles,
  colors,
} from "@/muiStyles";
import { useSnackbar } from "./SnackbarProvider";
import { useTranslations } from "next-intl";
import type { LeaveType, LeaveRequest, LeaveBalance, Person, Permissions } from "@/schemas";
import {
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  createLeaveRequest,
  reviewLeaveRequest,
  deleteLeaveRequest,
  allocateLeaveBalance,
} from "@/serverActions";

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
  const tn = useTranslations("leaveNotifications");
  const { showSnackbar } = useSnackbar();
  const [tabIndex, setTabIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const canRequest = permissions["leave:request"];
  const canApprove = permissions["leave:approve"];
  const canManageTypes = permissions["leave:manage_types"];

  const filteredRequests =
    statusFilter === "all" ? leaveRequests : leaveRequests.filter((r) => r.status === statusFilter);

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
        <RequestsTab
          requests={filteredRequests}
          leaveTypes={leaveTypes}
          persons={persons}
          canRequest={canRequest}
          canApprove={canApprove}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          showSnackbar={showSnackbar}
          t={t}
          tn={tn}
        />
      </TabPanel>

      <TabPanel value={tabIndex} index={1}>
        <LeaveTypesTab
          leaveTypes={leaveTypes}
          canManageTypes={canManageTypes}
          showSnackbar={showSnackbar}
          t={t}
          tn={tn}
        />
      </TabPanel>

      <TabPanel value={tabIndex} index={2}>
        <BalancesTab
          balances={leaveBalances}
          leaveTypes={leaveTypes}
          persons={persons}
          canManageTypes={canManageTypes}
          showSnackbar={showSnackbar}
          t={t}
          tn={tn}
        />
      </TabPanel>
    </Box>
  );
}

// ─── Requests Tab ────────────────────────────────────────────

function RequestsTab({
  requests,
  leaveTypes,
  persons,
  canRequest,
  canApprove,
  statusFilter,
  onStatusFilter,
  showSnackbar,
  t,
  tn,
}: {
  requests: LeaveRequest[];
  leaveTypes: LeaveType[];
  persons: Person[];
  canRequest: boolean;
  canApprove: boolean;
  statusFilter: string;
  onStatusFilter: (s: string) => void;
  showSnackbar: (msg: string) => void;
  t: ReturnType<typeof useTranslations<"leave">>;
  tn: ReturnType<typeof useTranslations<"leaveNotifications">>;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [, startTransition] = useTransition();

  const [createState, createAction, createPending] = useActionState(
    async (_prev: { error: string } | undefined, formData: FormData) => {
      const result = await createLeaveRequest(formData);
      if (!result?.error) {
        showSnackbar(tn("requestCreated"));
        setShowCreateForm(false);
      }
      return result;
    },
    undefined,
  );

  function handleReview(id: string, action: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", id);
      formData.set("action", action);
      const result = await reviewLeaveRequest(formData);
      if (!result?.error) {
        showSnackbar(action === "APPROVED" ? tn("requestApproved") : tn("requestRejected"));
      } else {
        showSnackbar(result.error);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", id);
      const result = await deleteLeaveRequest(formData);
      if (!result?.error) {
        showSnackbar(tn("requestCancelled"));
      } else {
        showSnackbar(result.error);
      }
    });
  }

  return (
    <>
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        {canRequest && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            sx={smallButtonStyles}
            onClick={() => setShowCreateForm(true)}
          >
            {t("createRequest")}
          </Button>
        )}
        <TextField
          select
          size="small"
          value={statusFilter}
          onChange={(e) => onStatusFilter(e.target.value)}
          inputProps={{ "aria-label": t("statusFilter") }}
          sx={{ ...textFieldStyles, minWidth: 140 }}
        >
          <MenuItem value="all">{t("filterAll")}</MenuItem>
          <MenuItem value="PENDING">{t("filterPending")}</MenuItem>
          <MenuItem value="APPROVED">{t("filterApproved")}</MenuItem>
          <MenuItem value="REJECTED">{t("filterRejected")}</MenuItem>
        </TextField>
      </Box>

      {showCreateForm && (
        <Box component="form" action={createAction} sx={formStyles}>
          <Typography variant="subtitle2" sx={{ color: colors.slate100 }}>
            {t("createRequest")}
          </Typography>
          <TextField
            select
            name="personId"
            label={t("selectPerson")}
            size="small"
            required
            sx={textFieldStyles}
          >
            {persons.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            name="leaveTypeId"
            label={t("selectLeaveType")}
            size="small"
            required
            sx={textFieldStyles}
          >
            {leaveTypes.map((lt) => (
              <MenuItem key={lt.id} value={lt.id}>
                {lt.name}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              name="startDate"
              label={t("startDate")}
              type="date"
              size="small"
              required
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ ...textFieldStyles, flex: 1 }}
            />
            <TextField
              name="endDate"
              label={t("endDate")}
              type="date"
              size="small"
              required
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ ...textFieldStyles, flex: 1 }}
            />
          </Box>
          <TextField
            name="days"
            label={t("days")}
            type="number"
            size="small"
            required
            slotProps={{ htmlInput: { min: 1 } }}
            sx={textFieldStyles}
          />
          <TextField
            name="note"
            label={t("note")}
            size="small"
            multiline
            rows={2}
            sx={textFieldStyles}
          />
          {createState?.error && (
            <Typography color="error" variant="body2">
              {createState.error}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              type="submit"
              variant="outlined"
              sx={smallButtonStyles}
              disabled={createPending}
            >
              {t("createRequest")}
            </Button>
            <Button
              variant="outlined"
              sx={smallButtonStyles}
              onClick={() => setShowCreateForm(false)}
            >
              {t("cancel")}
            </Button>
          </Box>
        </Box>
      )}

      {requests.length === 0 ? (
        <Typography sx={{ color: colors.slate400, mt: 2 }}>{t("noRequests")}</Typography>
      ) : (
        <TableContainer>
          <Table sx={tableStyles} size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: colors.slate400 }}>{t("person")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("leaveType")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("period")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("days")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("status")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("reviewer")}</TableCell>
                {(canApprove || canRequest) && (
                  <TableCell sx={{ color: colors.slate400 }}>{t("actions")}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id} sx={{ "&:hover": { backgroundColor: colors.rowHover } }}>
                  <TableCell sx={{ color: colors.slate100 }}>{r.personName}</TableCell>
                  <TableCell>
                    <Chip
                      label={r.leaveTypeName}
                      size="small"
                      sx={{ backgroundColor: r.leaveTypeColor, color: "#fff" }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: colors.slate100 }}>
                    {new Date(r.startDate).toLocaleDateString()} –{" "}
                    {new Date(r.endDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={{ color: colors.slate100 }}>{r.days}</TableCell>
                  <TableCell>
                    <StatusChip status={r.status} t={t} />
                  </TableCell>
                  <TableCell sx={{ color: colors.slate300 }}>{r.reviewerName ?? "—"}</TableCell>
                  {(canApprove || canRequest) && (
                    <TableCell>
                      {r.status === "PENDING" && canApprove && (
                        <>
                          <IconButton
                            size="small"
                            sx={{ color: colors.success }}
                            onClick={() => handleReview(r.id, "APPROVED")}
                            aria-label={t("approve")}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            sx={{ color: colors.error }}
                            onClick={() => handleReview(r.id, "REJECTED")}
                            aria-label={t("reject")}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                      {r.status === "PENDING" && canRequest && (
                        <IconButton
                          size="small"
                          sx={{ color: colors.slate300 }}
                          onClick={() => handleDelete(r.id)}
                          aria-label={t("cancel")}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}

function StatusChip({
  status,
  t,
}: {
  status: string;
  t: ReturnType<typeof useTranslations<"leave">>;
}) {
  const colorMap: Record<string, string> = {
    PENDING: colors.warning,
    APPROVED: colors.success,
    REJECTED: colors.error,
  };
  const labelMap: Record<string, () => string> = {
    PENDING: () => t("statusPending"),
    APPROVED: () => t("statusApproved"),
    REJECTED: () => t("statusRejected"),
  };
  return (
    <Chip
      label={labelMap[status]?.() ?? status}
      size="small"
      sx={{
        backgroundColor: colorMap[status] ?? colors.slate400,
        color: "#fff",
      }}
    />
  );
}

// ─── Leave Types Tab ─────────────────────────────────────────

function LeaveTypesTab({
  leaveTypes,
  canManageTypes,
  showSnackbar,
  t,
  tn,
}: {
  leaveTypes: LeaveType[];
  canManageTypes: boolean;
  showSnackbar: (msg: string) => void;
  t: ReturnType<typeof useTranslations<"leave">>;
  tn: ReturnType<typeof useTranslations<"leaveNotifications">>;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [createState, createAction, createPending] = useActionState(
    async (_prev: { error: string } | undefined, formData: FormData) => {
      const result = await createLeaveType(formData);
      if (!result?.error) {
        showSnackbar(tn("leaveTypeCreated"));
        setShowCreateForm(false);
      }
      return result;
    },
    undefined,
  );

  const [editState, editAction, editPending] = useActionState(
    async (_prev: { error: string } | undefined, formData: FormData) => {
      const result = await updateLeaveType(formData);
      if (!result?.error) {
        showSnackbar(tn("leaveTypeUpdated"));
        setEditId(null);
      }
      return result;
    },
    undefined,
  );

  function handleDelete(id: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", id);
      const result = await deleteLeaveType(formData);
      if (!result?.error) {
        showSnackbar(tn("leaveTypeDeleted"));
      } else {
        showSnackbar(result.error);
      }
      setDeleteDialogId(null);
    });
  }

  return (
    <>
      {canManageTypes && (
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          sx={{ ...smallButtonStyles, mb: 2 }}
          onClick={() => setShowCreateForm(true)}
        >
          {t("createLeaveType")}
        </Button>
      )}

      {showCreateForm && (
        <Box component="form" action={createAction} sx={formStyles}>
          <Typography variant="subtitle2" sx={{ color: colors.slate100 }}>
            {t("createLeaveType")}
          </Typography>
          <TextField
            name="name"
            label={t("enterName")}
            size="small"
            required
            sx={textFieldStyles}
          />
          <TextField
            name="description"
            label={t("enterDescription")}
            size="small"
            multiline
            rows={2}
            sx={textFieldStyles}
          />
          <TextField
            name="defaultDays"
            label={t("defaultDays")}
            type="number"
            size="small"
            defaultValue={0}
            slotProps={{ htmlInput: { min: 0 } }}
            sx={textFieldStyles}
          />
          <TextField
            name="color"
            label={t("color")}
            type="color"
            size="small"
            defaultValue="#1976d2"
            sx={textFieldStyles}
          />
          {createState?.error && (
            <Typography color="error" variant="body2">
              {createState.error}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              type="submit"
              variant="outlined"
              sx={smallButtonStyles}
              disabled={createPending}
            >
              {t("createLeaveType")}
            </Button>
            <Button
              variant="outlined"
              sx={smallButtonStyles}
              onClick={() => setShowCreateForm(false)}
            >
              {t("cancel")}
            </Button>
          </Box>
        </Box>
      )}

      {leaveTypes.length === 0 ? (
        <Typography sx={{ color: colors.slate400, mt: 2 }}>{t("noLeaveTypes")}</Typography>
      ) : (
        <TableContainer>
          <Table sx={tableStyles} size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: colors.slate400 }}>{t("enterName")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("enterDescription")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("defaultDays")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("color")}</TableCell>
                {canManageTypes && (
                  <TableCell sx={{ color: colors.slate400 }}>{t("actions")}</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {leaveTypes.map((lt) =>
                editId === lt.id ? (
                  <TableRow key={lt.id}>
                    <TableCell colSpan={5}>
                      <Box
                        component="form"
                        action={editAction}
                        sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
                      >
                        <input type="hidden" name="id" value={lt.id} />
                        <TextField
                          name="name"
                          defaultValue={lt.name}
                          size="small"
                          required
                          sx={{ ...textFieldStyles, flex: 1, minWidth: 120 }}
                        />
                        <TextField
                          name="description"
                          defaultValue={lt.description ?? ""}
                          size="small"
                          sx={{ ...textFieldStyles, flex: 2, minWidth: 150 }}
                        />
                        <TextField
                          name="defaultDays"
                          type="number"
                          defaultValue={lt.defaultDays}
                          size="small"
                          slotProps={{ htmlInput: { min: 0 } }}
                          sx={{ ...textFieldStyles, width: 80 }}
                        />
                        <TextField
                          name="color"
                          type="color"
                          defaultValue={lt.color}
                          size="small"
                          sx={{ ...textFieldStyles, width: 60 }}
                        />
                        {editState?.error && (
                          <Typography color="error" variant="body2" sx={{ width: "100%" }}>
                            {editState.error}
                          </Typography>
                        )}
                        <Button
                          type="submit"
                          variant="outlined"
                          sx={smallButtonStyles}
                          disabled={editPending}
                        >
                          {t("editLeaveType")}
                        </Button>
                        <Button
                          variant="outlined"
                          sx={smallButtonStyles}
                          onClick={() => setEditId(null)}
                        >
                          {t("cancel")}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={lt.id} sx={{ "&:hover": { backgroundColor: colors.rowHover } }}>
                    <TableCell sx={{ color: colors.slate100 }}>{lt.name}</TableCell>
                    <TableCell sx={{ color: colors.slate300 }}>{lt.description ?? "—"}</TableCell>
                    <TableCell sx={{ color: colors.slate100 }}>{lt.defaultDays}</TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: "4px",
                          backgroundColor: lt.color,
                        }}
                      />
                    </TableCell>
                    {canManageTypes && (
                      <TableCell>
                        <IconButton
                          size="small"
                          sx={{ color: colors.slate300 }}
                          onClick={() => setEditId(lt.id)}
                          aria-label={t("editLeaveType")}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          sx={{ color: colors.error }}
                          onClick={() => setDeleteDialogId(lt.id)}
                          aria-label={t("deleteLeaveType")}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!deleteDialogId} onClose={() => setDeleteDialogId(null)}>
        <DialogTitle>{t("deleteLeaveType")}</DialogTitle>
        <DialogContent>{t("deleteLeaveTypeConfirm")}</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogId(null)}>{t("cancel")}</Button>
          <Button color="error" onClick={() => deleteDialogId && handleDelete(deleteDialogId)}>
            {t("deleteLeaveType")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ─── Balances Tab ────────────────────────────────────────────

function BalancesTab({
  balances,
  leaveTypes,
  persons,
  canManageTypes,
  showSnackbar,
  t,
  tn,
}: {
  balances: LeaveBalance[];
  leaveTypes: LeaveType[];
  persons: Person[];
  canManageTypes: boolean;
  showSnackbar: (msg: string) => void;
  t: ReturnType<typeof useTranslations<"leave">>;
  tn: ReturnType<typeof useTranslations<"leaveNotifications">>;
}) {
  const [showAllocateForm, setShowAllocateForm] = useState(false);

  const [allocateState, allocateAction, allocatePending] = useActionState(
    async (_prev: { error: string } | undefined, formData: FormData) => {
      const result = await allocateLeaveBalance(formData);
      if (!result?.error) {
        showSnackbar(tn("balanceAllocated"));
        setShowAllocateForm(false);
      }
      return result;
    },
    undefined,
  );

  return (
    <>
      {canManageTypes && (
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          sx={{ ...smallButtonStyles, mb: 2 }}
          onClick={() => setShowAllocateForm(true)}
        >
          {t("allocateBalance")}
        </Button>
      )}

      {showAllocateForm && (
        <Box component="form" action={allocateAction} sx={formStyles}>
          <Typography variant="subtitle2" sx={{ color: colors.slate100 }}>
            {t("allocateBalance")}
          </Typography>
          <TextField
            select
            name="personId"
            label={t("selectPerson")}
            size="small"
            required
            sx={textFieldStyles}
          >
            {persons.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            name="leaveTypeId"
            label={t("selectLeaveType")}
            size="small"
            required
            sx={textFieldStyles}
          >
            {leaveTypes.map((lt) => (
              <MenuItem key={lt.id} value={lt.id}>
                {lt.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            name="year"
            label={t("year")}
            type="number"
            size="small"
            defaultValue={new Date().getFullYear()}
            sx={textFieldStyles}
          />
          <TextField
            name="allocated"
            label={t("allocatedDays")}
            type="number"
            size="small"
            required
            slotProps={{ htmlInput: { min: 0 } }}
            sx={textFieldStyles}
          />
          {allocateState?.error && (
            <Typography color="error" variant="body2">
              {allocateState.error}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              type="submit"
              variant="outlined"
              sx={smallButtonStyles}
              disabled={allocatePending}
            >
              {t("allocateBalance")}
            </Button>
            <Button
              variant="outlined"
              sx={smallButtonStyles}
              onClick={() => setShowAllocateForm(false)}
            >
              {t("cancel")}
            </Button>
          </Box>
        </Box>
      )}

      {balances.length === 0 ? (
        <Typography sx={{ color: colors.slate400, mt: 2 }}>{t("noBalances")}</Typography>
      ) : (
        <TableContainer>
          <Table sx={tableStyles} size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: colors.slate400 }}>{t("person")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("leaveType")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("year")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("allocated")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("used")}</TableCell>
                <TableCell sx={{ color: colors.slate400 }}>{t("remaining")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {balances.map((b) => (
                <TableRow key={b.id} sx={{ "&:hover": { backgroundColor: colors.rowHover } }}>
                  <TableCell sx={{ color: colors.slate100 }}>{b.personName}</TableCell>
                  <TableCell>
                    <Chip
                      label={b.leaveTypeName}
                      size="small"
                      sx={{ backgroundColor: b.leaveTypeColor, color: "#fff" }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: colors.slate100 }}>{b.year}</TableCell>
                  <TableCell sx={{ color: colors.slate100 }}>{b.allocated}</TableCell>
                  <TableCell sx={{ color: colors.slate100 }}>{b.used}</TableCell>
                  <TableCell
                    sx={{
                      color: b.remaining > 0 ? colors.success : colors.error,
                      fontWeight: "bold",
                    }}
                  >
                    {b.remaining}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}
