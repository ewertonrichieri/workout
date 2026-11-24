import { RENEWAL_NOTICE_DAYS } from "@/lib/constants/training";
import type { PlanValidity } from "./plan-types";

/** Renewal is suggested in the last days of validity and after it ends; never done automatically (step 3.6). */
export function isRenewalDue(validity: PlanValidity): boolean {
  return validity.isExpired || validity.remainingDays <= RENEWAL_NOTICE_DAYS;
}
