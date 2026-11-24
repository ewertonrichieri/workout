import { ListSkeleton } from "@/components/layout/list-skeleton";
import { translate } from "@/lib/i18n/translate";

export function ExerciseListSkeleton() {
  return <ListSkeleton label={translate("catalog.loading")} />;
}
