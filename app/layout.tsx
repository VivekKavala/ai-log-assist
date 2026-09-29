import { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deployment Troubleshooting Assistant",
  icons: {
    icon: "https://img.icons8.com/ios/50/bot.png", // Refers to public/my-custom-icon.png
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
