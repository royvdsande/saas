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
  return {
    userDoc: userDocSnap.exists() ? userDocSnap.data() : {},
    customerDoc: customerDocSnap.exists() ? customerDocSnap.data() : {},
    paymentsCount: paymentsSnap.size,
    subscriptionsCount: subscriptionsSnap.size,
    currentPriceId,
  };
}
