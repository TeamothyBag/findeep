export const theme = {
    colors: {
      primary: "#2D5D4B",       // Dark Green (Primary Brand Color)
      secondary: "#2A9D8F",     // Teal (Secondary Brand Color)
      accent: "#E9C46A",        // Warm Gold (CTAs, Highlights)
      warning: "#FF6B6B",       // Coral Pink (Warnings/Errors)
      background: "#F5F5F5",    // Off-White (Background)
      text: {
        primary: "#264653",     // Charcoal (Primary Text)
        secondary: "#2D5D4B",  // Dark Green (Secondary Text)
        inverse: "#F5F5F5",     // Off-White (Text on Dark Backgrounds)
      },
      neutrals: {
        border: "#E0E0E0",      // Light Gray (Borders/Dividers)
        disabled: "#BDBDBD",   // Gray (Disabled Elements)
      },
    },
    typography: {
      header: "Montserrat_700Bold",
      subheader: "Montserrat_600SemiBold",
      body: "OpenSans_400Regular",
      bodyBold: "OpenSans_600SemiBold",
      sizes: {
        h1: 32,
        h2: 24,
        h3: 20,
        body: 16,
        small: 14,
      },
    },
    gradients: {
      primary: ["#2A9D8F", "#2D5D4B"],  // Teal → Dark Green
      secondary: ["#E9C46A", "#FF6B6B"], // Gold → Coral (Use sparingly)
    },
    buttons: {
      primary: {
        backgroundColor: "#2A9D8F",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
      },
      secondary: {
        backgroundColor: "#E9C46A",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
      },
    },
    shadows: {
      card: {
        shadowColor: "#264653",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
  };