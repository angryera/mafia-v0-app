import { ShellLayout } from "@/components/shell-layout";

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShellLayout>{children}</ShellLayout>;
}
