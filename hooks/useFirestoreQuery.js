import { collection, getDocs, onSnapshot, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";

/**
 * Custom hook for fetching data from Firestore with loading and error states
 * @param {string} collectionName - Name of the Firestore collection
 * @param {Object} queryConstraints - Optional query constraints (where, orderBy, etc.)
 * @param {boolean} realtime - Whether to use onSnapshot for real-time updates
 * @returns {Object} { data, loading, error }
 */
export const useFirestoreQuery = (collectionName, queryConstraints = {}, realtime = false) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!collectionName) {
      setLoading(false);
      return;
    }

    try {
      const buildQuery = () => {
        let q = collection(db, collectionName);
        
        if (queryConstraints.where) {
          q = query(q, queryConstraints.where);
        }
        
        return q;
      };

      if (realtime) {
        const q = buildQuery();
        return onSnapshot(
          q,
          (snap) => {
            setData(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
            setError(null);
          },
          (err) => {
            setError(err?.message || "Failed to load data");
            setLoading(false);
          }
        );
      } else {
        const fetchData = async () => {
          const q = buildQuery();
          const snap = await getDocs(q);
          setData(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
          setError(null);
        };
        
        fetchData().catch((err) => {
          setError(err?.message || "Failed to load data");
          setLoading(false);
        });
      }
    } catch (err) {
      setError(err?.message || "An error occurred");
      setLoading(false);
    }
  }, [collectionName, JSON.stringify(queryConstraints), realtime]);

  return { data, loading, error };
};

export default useFirestoreQuery;
