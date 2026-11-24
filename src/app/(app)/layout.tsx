import { Suspense } from "react";
import { BottomNavigation, BottomNavigationBar } from "@/components/navigation/bottom-navigation";

/** Layout for signed-in screens: content plus the fixed bottom navigation. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))]">{children}</div>
      {/* Routes with request-time params resolve the pathname only at request time. */}
      <Suspense fallback={<BottomNavigationBar pathname={null} />}>
        <BottomNavigation />
      </Suspense>
    </>
  );
}
