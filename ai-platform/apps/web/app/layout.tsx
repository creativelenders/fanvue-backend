import "./styles.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Fanvue Promotion OS",
  description: "Creator CRM, campaign, AI media, and autonomous operations command center."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

