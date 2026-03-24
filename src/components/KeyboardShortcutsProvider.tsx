"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { colors } from "@/muiStyles";

interface ShortcutDef {
  keys: string;
  description: string;
}

const SHORTCUTS: ShortcutDef[] = [
  { keys: "/", description: "Focus search" },
  { keys: "g then d", description: "Go to Dashboard" },
  { keys: "g then p", description: "Go to Persons" },
  { keys: "g then t", description: "Go to Teams" },
  { keys: "g then e", description: "Go to Departments" },
  { keys: "g then l", description: "Go to Leave" },
  { keys: "g then r", description: "Go to Reviews" },
  { keys: "g then o", description: "Go to Org Chart" },
  { keys: "g then a", description: "Go to Admin" },
  { keys: "?", description: "Show keyboard shortcuts" },
  { keys: "Escape", description: "Close dialog / blur focus" },
];

interface KeyboardShortcutsContextValue {
  showHelp: () => void;
  hideHelp: () => void;
  helpOpen: boolean;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

export function useKeyboardShortcuts() {
  const ctx = useContext(KeyboardShortcutsContext);
  if (!ctx) throw new Error("useKeyboardShortcuts must be used within KeyboardShortcutsProvider");
  return ctx;
}

// Optional hook that returns null outside provider (for components that may render without it)
export function useKeyboardShortcutsMaybe() {
  return useContext(KeyboardShortcutsContext);
}

export default function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingPrefix = useRef<string | null>(null);
  const prefixTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showHelp = useCallback(() => setHelpOpen(true), []);
  const hideHelp = useCallback(() => setHelpOpen(false), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const tagName = target.tagName;
      const isInput =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target.isContentEditable;

      // "/" focuses the search bar even from non-input context
      if (e.key === "/" && !isInput) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          '[data-keyboard-shortcut="search"]',
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // Ignore shortcuts when typing in form fields
      if (isInput) return;

      // "?" shows help dialog
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((prev) => !prev);
        return;
      }

      // Escape closes help or blurs active element
      if (e.key === "Escape") {
        if (helpOpen) {
          setHelpOpen(false);
        } else if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }

      // "g" prefix chord — wait for second key
      if (e.key === "g" && !pendingPrefix.current) {
        pendingPrefix.current = "g";
        if (prefixTimer.current) clearTimeout(prefixTimer.current);
        prefixTimer.current = setTimeout(() => {
          pendingPrefix.current = null;
        }, 1000);
        return;
      }

      // Second key after "g" prefix
      if (pendingPrefix.current === "g") {
        pendingPrefix.current = null;
        if (prefixTimer.current) clearTimeout(prefixTimer.current);

        const routes: Record<string, string> = {
          d: "/dashboard",
          p: "/managePersons",
          t: "/manageTeams",
          e: "/manageDepartments",
          l: "/leave",
          r: "/reviews",
          o: "/orgchart",
          a: "/admin",
        };

        const route = routes[e.key];
        if (route) {
          e.preventDefault();
          router.push(route);
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (prefixTimer.current) clearTimeout(prefixTimer.current);
    };
  }, [router, helpOpen]);

  return (
    <KeyboardShortcutsContext.Provider value={{ showHelp, hideHelp, helpOpen }}>
      {children}
      <Dialog
        open={helpOpen}
        onClose={hideHelp}
        maxWidth="sm"
        fullWidth
        aria-labelledby="keyboard-shortcuts-title"
      >
        <DialogTitle
          id="keyboard-shortcuts-title"
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: colors.background,
            color: colors.text,
          }}
        >
          <Typography variant="h6" component="span">
            Keyboard Shortcuts
          </Typography>
          <IconButton
            onClick={hideHelp}
            size="small"
            aria-label="Close"
            sx={{ color: colors.text }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: colors.background, p: 0 }}>
          <Table size="small">
            <TableBody>
              {SHORTCUTS.map((s) => (
                <TableRow key={s.keys}>
                  <TableCell sx={{ color: colors.textSecondary, width: "40%" }}>
                    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                      {s.keys.split(" then ").map((key, i) => (
                        <Box key={i} sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                          {i > 0 && (
                            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                              then
                            </Typography>
                          )}
                          <Box
                            component="kbd"
                            sx={{
                              px: 1,
                              py: 0.25,
                              borderRadius: 0.5,
                              border: "1px solid",
                              borderColor: colors.textSecondary,
                              fontFamily: "monospace",
                              fontSize: "0.85rem",
                              color: colors.text,
                            }}
                          >
                            {key}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: colors.text }}>{s.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </KeyboardShortcutsContext.Provider>
  );
}
