import { TextTranslateQuery } from "@bob-translate/types";
import { generateSetKey } from "../util";

const records = new Map<string, string>();
const maxRecords = 100;

export function useRecords(query: TextTranslateQuery) {
  const addRecord = (value: string) => {
    records.set(generateSetKey(query), value);
    if (records.size > maxRecords) {
      deleteLastRecord();
    }
  };

  const getRecord = () => {
    return records.get(generateSetKey(query)) || "";
  };

  const deleteLastRecord = () => {
    const lastKey = records.keys().next().value;
    if (lastKey) {
      records.delete(lastKey);
    }
  };

  const clearRecords = () => {
    records.clear();
  };

  const hasRecord = () => {
    return records.has(generateSetKey(query));
  };

  return {
    addRecord,
    getRecord,
    clearRecords,
    hasRecord,
  };
}
