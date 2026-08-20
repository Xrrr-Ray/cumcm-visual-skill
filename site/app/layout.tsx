import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://xrrr-ray.github.io/cumcm-visual-skill/"),
  title: "CUMCM Figure Skill｜数模国赛论文配图",
  description:
    "面向 CUMCM 数模国赛和学术论文写作的可编辑可视化 Skill，支持 Codex 与 Kimi K3，输出 HTML、SVG、PNG、JSON 与 PowerPoint 可编辑 PPTX。",
  icons: {
    icon: "/cumcm-visual-skill/favicon.svg",
    shortcut: "/cumcm-visual-skill/favicon.svg",
  },
  openGraph: {
    type: "website",
    url: "https://xrrr-ray.github.io/cumcm-visual-skill/",
    title: "CUMCM Figure Skill｜数模国赛论文配图",
    description:
      "面向 CUMCM 数模国赛和学术论文写作的可编辑可视化 Skill，支持 Codex 与 Kimi K3，输出 HTML、SVG、PNG、JSON 与 PowerPoint 可编辑 PPTX。",
    images: [
      {
        url: "https://xrrr-ray.github.io/cumcm-visual-skill/og.png",
        width: 1200,
        height: 630,
        alt: "CUMCM Figure Skill：面向数模国赛的论文配图工具",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CUMCM Figure Skill｜数模国赛论文配图",
    description:
      "面向 CUMCM 数模国赛和学术论文写作的可编辑可视化 Skill，支持 Codex 与 Kimi K3。",
    images: ["https://xrrr-ray.github.io/cumcm-visual-skill/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
