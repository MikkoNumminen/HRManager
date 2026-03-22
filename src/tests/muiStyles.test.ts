import {
  colors,
  formStyles,
  headerStyles,
  textFieldStyles,
  radioStyles,
  smallButtonStyles,
  largeButtonStyles,
  activeButtonStyles,
  avatarStyles,
  userMenuStyles,
  userMenuItemStyles,
  tableStyles,
  mobileCardStyles,
  mobileCardClickableStyles,
  formButtonContainerStyles,
  pageContainerStyles,
  boxStyles,
} from "../muiStyles";

describe("muiStyles", () => {
  describe("colors", () => {
    // All 14 color tokens are defined as CSS custom property references
    test("defines all 14 color tokens", () => {
      const expectedKeys = [
        "slate100",
        "slate300",
        "slate400",
        "slate600",
        "slate700",
        "green400",
        "green900",
        "rowHover",
        "hoverOverlay",
        "error",
        "errorBg",
        "warning",
        "info",
        "success",
      ];
      expect(Object.keys(colors)).toEqual(expectedKeys);
    });

    // Every color references a CSS custom property
    test("every color is a var(--hrm-*) reference", () => {
      for (const [key, value] of Object.entries(colors)) {
        expect(value).toMatch(/^var\(--hrm-/);
        expect(value).toContain(key);
      }
    });
  });

  describe("formStyles", () => {
    // Form uses flex column layout with gap
    test("uses flex column layout", () => {
      expect(formStyles.display).toBe("flex");
      expect(formStyles.flexDirection).toBe("column");
      expect(formStyles.gap).toBe(2);
    });

    // Form has a border using the slate300 color token
    test("has slate300 border", () => {
      expect(formStyles.border).toContain(colors.slate300);
    });

    // Form padding is responsive — tighter on mobile
    test("has responsive padding (xs: 1.5, sm: 2)", () => {
      expect(formStyles.p).toEqual({ xs: 1.5, sm: 2 });
    });
  });

  describe("headerStyles", () => {
    // Header uses flex layout with space-between alignment
    test("uses flex space-between layout", () => {
      expect(headerStyles.display).toBe("flex");
      expect(headerStyles.justifyContent).toBe("space-between");
      expect(headerStyles.alignItems).toBe("center");
    });
  });

  describe("textFieldStyles", () => {
    // TextField has styled root, label, and focused states
    test("defines input root, label, and focused label styles", () => {
      expect(textFieldStyles["& .MuiOutlinedInput-root"]).toBeDefined();
      expect(textFieldStyles["& .MuiInputLabel-root"]).toBeDefined();
      expect(textFieldStyles["& .MuiInputLabel-root.Mui-focused"]).toBeDefined();
    });

    // TextField input uses slate300 for default color
    test("input root color is slate300", () => {
      expect(textFieldStyles["& .MuiOutlinedInput-root"].color).toBe(colors.slate300);
    });
  });

  describe("radioStyles", () => {
    // Radio uses slate300 for both default and checked states
    test("uses slate300 for default and checked color", () => {
      expect(radioStyles.color).toBe(colors.slate300);
      expect(radioStyles["&.Mui-checked"].color).toBe(colors.slate300);
    });
  });

  describe("smallButtonStyles", () => {
    // Small button has border, hover, focus, and disabled states
    test("has all interaction states", () => {
      expect(smallButtonStyles["&:hover"]).toBeDefined();
      expect(smallButtonStyles["&:focus-within"]).toBeDefined();
      expect(smallButtonStyles["&.Mui-disabled"]).toBeDefined();
    });

    // Disabled state uses reduced opacity and not-allowed cursor
    test("disabled state has opacity and not-allowed cursor", () => {
      expect(smallButtonStyles["&.Mui-disabled"].opacity).toBe(0.25);
      expect(smallButtonStyles["&.Mui-disabled"].cursor).toBe("not-allowed");
      expect(smallButtonStyles["&.Mui-disabled"].pointerEvents).toBe("auto");
    });
  });

  describe("largeButtonStyles", () => {
    // Large button takes full width
    test("is full width", () => {
      expect(largeButtonStyles.width).toBe("100%");
    });

    // Large button has hover and focus states
    test("has hover and focus-within states", () => {
      expect(largeButtonStyles["&:hover"].backgroundColor).toBe(colors.slate600);
      expect(largeButtonStyles["&:focus-within"].backgroundColor).toBe(colors.slate600);
    });
  });

  describe("activeButtonStyles", () => {
    // Active button uses green color scheme
    test("uses green400 for active state", () => {
      expect(activeButtonStyles.borderColor).toBe(colors.green400);
      expect(activeButtonStyles.color).toBe(colors.green400);
    });

    // Active button hover uses green900 background
    test("hover uses green900 background", () => {
      expect(activeButtonStyles["&:hover"].backgroundColor).toBe(colors.green900);
    });
  });

  describe("avatarStyles", () => {
    // Avatar is larger on mobile for touch targets
    test("has responsive size (xs: 36, sm: 32)", () => {
      expect(avatarStyles.width).toEqual({ xs: 36, sm: 32 });
      expect(avatarStyles.height).toEqual({ xs: 36, sm: 32 });
    });

    // Avatar has border and font size
    test("has border and font size", () => {
      expect(avatarStyles.border).toContain(colors.slate300);
      expect(avatarStyles.fontSize).toBe("0.875rem");
    });
  });

  describe("userMenuStyles", () => {
    // Menu paper width is responsive — wider on mobile
    test("has responsive width (xs: 70vw/90vw, sm: 200/none)", () => {
      const paper = userMenuStyles["& .MuiPaper-root"];
      expect(paper.minWidth).toEqual({ xs: "70vw", sm: 200 });
      expect(paper.maxWidth).toEqual({ xs: "90vw", sm: "none" });
    });

    // Menu uses slate600 background with border
    test("uses slate600 background", () => {
      const paper = userMenuStyles["& .MuiPaper-root"];
      expect(paper.backgroundColor).toBe(colors.slate600);
      expect(paper.border).toContain(colors.slate300);
    });
  });

  describe("userMenuItemStyles", () => {
    // Menu item uses slate100 text with hover overlay
    test("uses slate100 color with hover overlay", () => {
      expect(userMenuItemStyles.color).toBe(colors.slate100);
      expect(userMenuItemStyles["&:hover"].backgroundColor).toBe(colors.hoverOverlay);
    });
  });

  describe("tableStyles", () => {
    // Table min-width is responsive — narrower on mobile
    test("has responsive min-width (xs: 500, sm: 650)", () => {
      expect(tableStyles.minWidth).toEqual({ xs: 500, sm: 650 });
    });

    // Table takes full width
    test("is full width", () => {
      expect(tableStyles.width).toBe("100%");
    });
  });

  describe("mobileCardStyles", () => {
    // Mobile card has border, rounded corners, padding, and margin
    test("has border, borderRadius, padding, and margin", () => {
      expect(mobileCardStyles.border).toContain(colors.slate300);
      expect(mobileCardStyles.borderRadius).toBe("4px");
      expect(mobileCardStyles.p).toBe(2);
      expect(mobileCardStyles.mb).toBe(1.5);
    });
  });

  describe("mobileCardClickableStyles", () => {
    // Clickable card extends base card styles
    test("inherits all base mobileCardStyles properties", () => {
      expect(mobileCardClickableStyles.border).toBe(mobileCardStyles.border);
      expect(mobileCardClickableStyles.borderRadius).toBe(mobileCardStyles.borderRadius);
      expect(mobileCardClickableStyles.p).toBe(mobileCardStyles.p);
      expect(mobileCardClickableStyles.mb).toBe(mobileCardStyles.mb);
    });

    // Clickable card has pointer cursor and hover effect
    test("has pointer cursor and hover/focus-visible effect", () => {
      expect(mobileCardClickableStyles.cursor).toBe("pointer");
      expect(mobileCardClickableStyles["&:hover, &:focus-visible"].backgroundColor).toBe(
        colors.rowHover,
      );
    });

    // Clickable card has transition for smooth hover
    test("has background-color transition", () => {
      expect(mobileCardClickableStyles.transition).toContain("background-color");
    });
  });

  describe("formButtonContainerStyles", () => {
    // Button container uses flex layout
    test("uses flex layout with gap", () => {
      expect(formButtonContainerStyles.display).toBe("flex");
      expect(formButtonContainerStyles.gap).toBe(1);
    });

    // Buttons stack vertically on mobile, horizontally on desktop
    test("has responsive flex direction (xs: column, sm: row)", () => {
      expect(formButtonContainerStyles.flexDirection).toEqual({ xs: "column", sm: "row" });
    });

    // Buttons align to the end of the container
    test("aligns to flex-end", () => {
      expect(formButtonContainerStyles.justifyContent).toBe("flex-end");
    });
  });

  describe("pageContainerStyles", () => {
    // Page container has a border
    test("has slate300 border", () => {
      expect(pageContainerStyles.border).toContain(colors.slate300);
    });

    // Page container has rounded corners
    test("has 4px border radius", () => {
      expect(pageContainerStyles.borderRadius).toBe("4px");
    });

    // Page container padding is responsive — tighter on mobile
    test("has responsive padding (xs: 12px, sm: 20px)", () => {
      expect(pageContainerStyles.padding).toEqual({ xs: "12px", sm: "20px" });
    });
  });

  describe("boxStyles", () => {
    // Box has responsive padding
    test("has responsive padding (xs: 16px, sm: 20px)", () => {
      expect(boxStyles.padding).toEqual({ xs: "16px", sm: "20px" });
    });

    // Box has hover effect with overlay
    test("has hover overlay effect", () => {
      expect(boxStyles["&:hover"].backgroundColor).toBe(colors.hoverOverlay);
    });

    // Box has transition for smooth hover
    test("has background-color transition", () => {
      expect(boxStyles.transition).toContain("background-color");
    });

    // Box has border and margin bottom
    test("has border and margin bottom", () => {
      expect(boxStyles.border).toContain(colors.slate300);
      expect(boxStyles.mb).toBe(1.5);
    });
  });

  describe("responsive breakpoints consistency", () => {
    // All responsive tokens use xs/sm breakpoint pairs consistently
    test("all responsive tokens use xs and sm breakpoints", () => {
      const responsiveProps = [
        formStyles.p,
        avatarStyles.width,
        avatarStyles.height,
        userMenuStyles["& .MuiPaper-root"].minWidth,
        userMenuStyles["& .MuiPaper-root"].maxWidth,
        tableStyles.minWidth,
        formButtonContainerStyles.flexDirection,
        pageContainerStyles.padding,
        boxStyles.padding,
      ];

      for (const prop of responsiveProps) {
        expect(prop).toHaveProperty("xs");
        expect(prop).toHaveProperty("sm");
      }
    });
  });
});
