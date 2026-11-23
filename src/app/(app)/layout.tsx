import { BottomNavigation } from "@/components/navigation/bottom-navigation";

/** Layout for signed-in screens: content plus the fixed bottom navigation. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))]">{children}</div>
      <BottomNavigation />
    </>
  );
}
