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
    // 删除第一个（最旧的）记录，实现 LRU 缓存
    // Map 保持插入顺序，所以第一个就是最旧的
    const firstKey = records.keys().next().value;
    if (firstKey) {
      records.delete(firstKey);
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
