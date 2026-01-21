import "./globals.css";
import { MobileShell } from "../components/MobileShell";

export const metadata = {
  title: "My Club Running",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <MobileShell>{children}</MobileShell>
      </body>
    </html>
  );
}
