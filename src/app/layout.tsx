import type { Metadata } from "next";
import { Darker_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { CopilotKit } from "@copilotkit/react-core";
import "./globals.css";
import "@copilotkit/react-ui/styles.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});


const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const darkerGrotesque = Darker_Grotesque({
  variable: "--font-darker-grotesque",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Coplana",
  description: "An AI-Powered Study Schedule Generator.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${darkerGrotesque.className} ${geistMono.variable} antialiased`}>
        <CopilotKit runtimeUrl="/api/copilotkit" agent="studyPlannerAgent">
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
