import {
  getDoc,
  getDocs,
  setDoc,
  doc,
  collection,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { state, plusLocalKey } from "./state.js";

export function hasLocalPlusStatus() {
  return localStorage.getItem(plusLocalKey) === "true";
}

export async function savePlusStatusToCloud(user) {
  try {
    await setDoc(
      doc(state.firestore, "users", user.uid),
      {
        hasBinasPlus: true,
        plusLinkedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    localStorage.removeItem(plusLocalKey);
    return true;
  } catch {
    return false;
  }
}

export async function checkCloudPlusStatus(user) {
  try {
    const userDoc = await getDoc(doc(state.firestore, "users", user.uid));
    if (userDoc.exists() && userDoc.data().hasBinasPlus) {
      return true;
    }

    const paymentsSnap = await getDocs(collection(state.firestore, "customers", user.uid, "payments"));
    if (!paymentsSnap.empty) {
      for (const paymentDoc of paymentsSnap.docs) {
        if (paymentDoc.data().status === "succeeded") {
          return true;
        }
      }
    }

    const subSnap = await getDocs(
      query(
        collection(state.firestore, "customers", user.uid, "subscriptions"),
        where("status", "in", ["active", "trialing"])
      )
    );
    return !subSnap.empty;
  } catch {
    return false;
  }
}

export async function getDashboardContext(user) {
  const userDocSnap = await getDoc(doc(state.firestore, "users", user.uid));
  const customerDocSnap = await getDoc(doc(state.firestore, "customers", user.uid));
  const paymentsSnap = await getDocs(collection(state.firestore, "customers", user.uid, "payments"));
  const subscriptionsSnap = await getDocs(collection(state.firestore, "customers", user.uid, "subscriptions"));

  const activeSub = subscriptionsSnap.docs.find((d) =>
    ["active", "trialing"].includes(d.data().status)
  );
  const currentPriceId =
    activeSub?.data()?.price?.id ||
    activeSub?.data()?.items?.[0]?.price?.id ||
    null;
  const subData = activeSub?.data() ?? null;
  const toDate = (val) => {
    if (!val) return null;
    if (typeof val.toDate === "function") return val.toDate(); // Firestore Timestamp
    if (val instanceof Date) return val;
    if (typeof val === "number") return new Date(val * 1000); // Unix seconds
    return null;
  };
  const renewalDate = toDate(subData?.current_period_end);
  const subStatus = subData?.status ?? null;
  const cancelAtPeriodEnd = subData?.cancel_at_period_end ?? false;
  const cancelAt = toDate(subData?.cancel_at);
  const trialEnd = toDate(subData?.trial_end);

  return {
    userDoc: userDocSnap.exists() ? userDocSnap.data() : {},
    customerDoc: customerDocSnap.exists() ? customerDocSnap.data() : {},
    paymentsCount: paymentsSnap.size,
    subscriptionsCount: subscriptionsSnap.size,
    currentPriceId,
    renewalDate,
    subStatus,
    cancelAtPeriodEnd,
    cancelAt,
    trialEnd,
  };
}
